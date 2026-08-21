import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getActiveBanner, toggleBannerStatus } from "./banners.server";

export const getActiveBannerFn = createServerFn({ method: "GET" })
  .inputValidator((data) => z.object({ organizationId: z.string() }).parse(data))
  .handler(async ({ data }) => {
    return getActiveBanner(data.organizationId);
  });

export const toggleBannerStatusFn = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ 
    bannerId: z.string(), 
    organizationId: z.string(), 
    isActive: z.boolean() 
  }).parse(data))
  .handler(async ({ data }) => {
    return toggleBannerStatus(data.bannerId, data.organizationId, data.isActive);
  });
