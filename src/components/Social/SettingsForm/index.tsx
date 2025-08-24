"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAdminProfile } from "@/components/MyProfile/useAdminProfile";
import { z } from "zod";

const settingsSchema = z.object({
  full_name: z.string().min(2, "الاسم يجب أن يكون على الأقل حرفين"),
  phone: z.string().optional(),
  city: z.string().optional(),
  address: z.string().optional(),
});

type SettingsFormData = z.infer<typeof settingsSchema>;

export default function SettingsForm() {
  const { data: adminProfile, isLoading } = useAdminProfile();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      full_name: adminProfile?.full_name || "",
      phone: adminProfile?.phone || "",
      city: adminProfile?.city || "",
      address: adminProfile?.address || "",
    },
  });

  const onSubmit = async (data: SettingsFormData) => {
    try {
      setIsSubmitting(true);
      // TODO: Implement profile update functionality
      console.log("Profile update data:", data);
    } catch (error) {
      console.error("Error updating profile:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="trezo-card bg-white dark:bg-[#0c1427] p-[20px] md:p-[25px] rounded-md">
      <div className="trezo-card-header mb-[20px] md:mb-[25px]">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-0">
          تحديث الملف الشخصي
        </h3>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            الاسم الكامل
          </label>
          <input
            {...register("full_name")}
            type="text"
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            placeholder="أدخل الاسم الكامل"
          />
          {errors.full_name && (
            <p className="text-red-500 text-sm mt-1">
              {errors.full_name.message}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            رقم الهاتف
          </label>
          <input
            {...register("phone")}
            type="tel"
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            placeholder="أدخل رقم الهاتف"
          />
          {errors.phone && (
            <p className="text-red-500 text-sm mt-1">{errors.phone.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            المدينة
          </label>
          <input
            {...register("city")}
            type="text"
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            placeholder="أدخل المدينة"
          />
          {errors.city && (
            <p className="text-red-500 text-sm mt-1">{errors.city.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            العنوان
          </label>
          <textarea
            {...register("address")}
            rows={3}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            placeholder="أدخل العنوان"
          />
          {errors.address && (
            <p className="text-red-500 text-sm mt-1">
              {errors.address.message}
            </p>
          )}
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "جاري الحفظ..." : "حفظ التغييرات"}
          </button>
        </div>
      </form>
    </div>
  );
}
