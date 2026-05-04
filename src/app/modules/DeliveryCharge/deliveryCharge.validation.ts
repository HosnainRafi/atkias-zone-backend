import { z } from "zod";

const updateDeliveryChargeConfigZodSchema = z.object({
  body: z.object({
    insideDhaka: z.coerce.number().min(0),
    outsideDhaka: z.coerce.number().min(0),
  }),
});

export const DeliveryChargeValidation = {
  updateDeliveryChargeConfigZodSchema,
};
