import { badRequest } from "../utils/errors.js";

/** Validates req[source] against a zod schema; parsed (trimmed, stripped) data lands in req.valid[source]. */
export const validate = (schema, source = "body") => (req, _res, next) => {
  const result = schema.safeParse(req[source] ?? {});
  if (!result.success) {
    const issues = result.error.issues.map((i) => ({ path: i.path.join("."), message: i.message }));
    throw badRequest("VALIDATION_ERROR", issues[0]?.message ?? "Invalid input", issues);
  }
  req.valid = { ...req.valid, [source]: result.data };
  next();
};
