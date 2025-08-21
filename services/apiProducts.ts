import { decode } from "base64-arraybuffer";
import supabase from "./supabase";

export interface ProductAttribute {
  id?: string;
  product_id?: string;
  attribute_name: string;
  attribute_value: string;
}

export interface Product {
  id?: string;
  name_ar: string;
  name_en: string;
  description_ar?: string;
  description_en?: string;
  price: number;
  offer_price?: number;
  stock?: number;
  image_url?: string[];
  category_id?: string;
  is_best_seller?: boolean;
  limited_time_offer?: boolean;
  created_at?: string;
  updated_at?: string;
  attributes?: ProductAttribute[];
}

export async function getProducts(
  page = 1,
  limit = 10,
  filters?: {
    categoryId?: string;
    search?: string;
    date?: string;
    isBestSeller?: boolean;
    limitedTimeOffer?: boolean;
  }
): Promise<{ products: Product[]; total: number }> {
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase.from("products").select(
    `
      *,
      attributes:product_attributes(*)
    `,
    { count: "exact" }
  );

  if (filters?.categoryId) {
    query = query.eq("category_id", filters.categoryId);
  }

  if (filters?.search) {
    query = query.or(
      `name_ar.ilike.%${filters.search}%,name_en.ilike.%${filters.search}%`
    );
  }

  if (filters?.date) {
    const now = new Date();
    const startDate = new Date();

    switch (filters.date) {
      case "today":
        startDate.setHours(0, 0, 0, 0);
        break;
      case "week":
        startDate.setDate(now.getDate() - 7);
        break;
      case "month":
        startDate.setMonth(now.getMonth() - 1);
        break;
      case "year":
        startDate.setFullYear(now.getFullYear() - 1);
        break;
    }

    query = query.gte("created_at", startDate.toISOString());
  }

  if (filters?.isBestSeller !== undefined) {
    query = query.eq("is_best_seller", filters.isBestSeller);
  }

  if (filters?.limitedTimeOffer !== undefined) {
    query = query.eq("limited_time_offer", filters.limitedTimeOffer);
  }

  query = query.order("created_at", { ascending: false });

  const { data: products, error, count } = await query.range(from, to);

  if (error) {
    console.error("خطأ في جلب المنتجات:", error.message);
    throw new Error("تعذر تحميل المنتجات");
  }

  console.log("Debug - Raw products data from getProducts:", products);
  console.log("Debug - Products count:", count);

  return {
    products: products || [],
    total: count ?? 0,
  };
}

export async function getProductById(id: string): Promise<Product> {
  const { data, error } = await supabase
    .from("products")
    .select(
      `
      *,
      attributes:product_attributes(*)
    `
    )
    .eq("id", id)
    .single();

  if (error) throw error;

  return data;
}

export async function createProduct(productData: Product): Promise<Product> {
  const { attributes, ...product } = productData;

  // Create the product first
  const { data: createdProduct, error: productError } = await supabase
    .from("products")
    .insert([product])
    .select()
    .single();

  if (productError) {
    console.error("خطأ في إنشاء المنتج:", productError);
    throw new Error("تعذر إنشاء المنتج");
  }

  // If there are attributes, create them
  if (attributes && attributes.length > 0) {
    const attributesWithProductId = attributes.map((attr) => ({
      ...attr,
      product_id: createdProduct.id,
    }));

    const { error: attributesError } = await supabase
      .from("product_attributes")
      .insert(attributesWithProductId);

    if (attributesError) {
      console.error("خطأ في إنشاء خصائص المنتج:", attributesError);
    }
  }

  return createdProduct;
}

export async function uploadProductImage(
  file: File | { base64: string; name: string },
  folder = "products"
): Promise<string> {
  let fileExt: string;
  let fileName: string;
  let fileData: File | ArrayBuffer;

  if (file instanceof File) {
    fileExt = file.name.split(".").pop()!;
    fileName = `${folder}/${Date.now()}-${Math.random()
      .toString(36)
      .substring(2)}.${fileExt}`;
    fileData = file;
  } else {
    // Base64 case
    fileExt = file.name.split(".").pop()!;
    fileName = `${folder}/${Date.now()}-${Math.random()
      .toString(36)
      .substring(2)}.${fileExt}`;
    fileData = decode(file.base64);
  }

  const { error } = await supabase.storage
    .from("product-images")
    .upload(fileName, fileData, {
      contentType: file instanceof File ? file.type : `image/${fileExt}`,
    });

  if (error) {
    console.error("خطأ أثناء رفع صورة المنتج:", error.message);
    throw new Error("تعذر رفع صورة المنتج");
  }

  const { data: publicUrlData } = supabase.storage
    .from("product-images")
    .getPublicUrl(fileName);

  return publicUrlData.publicUrl;
}

export async function deleteProduct(id: string) {
  // First, get the product to check if it has images
  const { data: product, error: fetchError } = await supabase
    .from("products")
    .select("image_url")
    .eq("id", id)
    .single();

  if (fetchError) {
    console.error("Supabase fetch error:", fetchError);
    throw new Error("حدث خطأ أثناء جلب بيانات المنتج");
  }

  // Delete the images if they exist
  if (product?.image_url && product.image_url.length > 0) {
    for (const imageUrl of product.image_url) {
      const path = new URL(imageUrl).pathname;
      const match = path.match(
        /\/storage\/v1\/object\/public\/product-images\/(.+)/
      );
      const filePath = match?.[1];

      if (filePath) {
        const { error: storageError } = await supabase.storage
          .from("product-images")
          .remove([filePath]);

        if (storageError) {
          console.error("فشل حذف صورة المنتج:", storageError);
        }
      }
    }
  }

  // Delete the product (attributes will be deleted automatically due to CASCADE)
  const { error: deleteError } = await supabase
    .from("products")
    .delete()
    .eq("id", id);

  if (deleteError) {
    throw new Error("حدث خطأ أثناء حذف المنتج");
  }
}

export async function updateProduct(
  id: string,
  updatedProduct: Partial<Product>
) {
  const { attributes, ...product } = updatedProduct;

  // Update the product
  const { data, error } = await supabase
    .from("products")
    .update(product)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("خطأ في تحديث المنتج:", error.message);
    throw new Error("تعذر تحديث المنتج");
  }

  // If there are attributes to update, handle them
  if (attributes !== undefined) {
    // Delete existing attributes
    await supabase.from("product_attributes").delete().eq("product_id", id);

    // Insert new attributes
    if (attributes.length > 0) {
      const attributesWithProductId = attributes.map((attr) => ({
        ...attr,
        product_id: id,
      }));

      const { error: attributesError } = await supabase
        .from("product_attributes")
        .insert(attributesWithProductId);

      if (attributesError) {
        console.error("خطأ في تحديث خصائص المنتج:", attributesError);
      }
    }
  }

  return data;
}
