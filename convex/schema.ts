import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  emailMessages: defineTable({
    cacheKey: v.string(),
    accountEmail: v.string(),
    messageId: v.string(),
    from: v.string(),
    subject: v.string(),
    date: v.string(),
    preview: v.string(),
    sortTime: v.number(),
    bodyText: v.optional(v.string()),
    bodyHtml: v.optional(v.string()),
    body: v.optional(v.string()),
    updatedAt: v.number(),
  })
    .index("by_cache_key", ["cacheKey"])
    .index("by_sort_time", ["sortTime"]),

  emailAccountSummaries: defineTable({
    accountId: v.string(),
    email: v.string(),
    messagesTotal: v.number(),
    threadsTotal: v.number(),
    updatedAt: v.number(),
  }).index("by_account_id", ["accountId"]),
});
