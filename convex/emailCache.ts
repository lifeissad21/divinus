import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

type CachedInboxMessage = {
  accountEmail: string;
  messageId: string;
  from: string;
  subject: string;
  date: string;
  preview: string;
  sortTime: number;
};

export const getInboxSnapshot = query({
  args: {
    maxResults: v.number(),
  },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("emailMessages")
      .withIndex("by_sort_time")
      .order("desc")
      .take(args.maxResults);

    const accounts = await ctx.db.query("emailAccountSummaries").collect();

    return {
      messages: messages.map((message) => ({
        id: `${message.accountEmail}:${message.messageId}`,
        messageId: message.messageId,
        accountEmail: message.accountEmail,
        from: message.from,
        subject: message.subject,
        date: message.date,
        preview: message.preview,
      })),
      accounts: accounts.map((account) => ({
        id: account.accountId,
        email: account.email,
        messagesTotal: account.messagesTotal,
        threadsTotal: account.threadsTotal,
      })),
    };
  },
});

export const upsertInboxSnapshot = mutation({
  args: {
    messages: v.array(
      v.object({
        accountEmail: v.string(),
        messageId: v.string(),
        from: v.string(),
        subject: v.string(),
        date: v.string(),
        preview: v.string(),
        sortTime: v.number(),
      }),
    ),
    accounts: v.array(
      v.object({
        id: v.string(),
        email: v.string(),
        messagesTotal: v.number(),
        threadsTotal: v.number(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    for (const message of args.messages as CachedInboxMessage[]) {
      const cacheKey = `${message.accountEmail}:${message.messageId}`;
      const existing = await ctx.db
        .query("emailMessages")
        .withIndex("by_cache_key", (queryBuilder) => queryBuilder.eq("cacheKey", cacheKey))
        .unique();

      if (existing) {
        await ctx.db.patch(existing._id, {
          accountEmail: message.accountEmail,
          messageId: message.messageId,
          from: message.from,
          subject: message.subject,
          date: message.date,
          preview: message.preview,
          sortTime: message.sortTime,
          updatedAt: now,
        });
      } else {
        await ctx.db.insert("emailMessages", {
          cacheKey,
          accountEmail: message.accountEmail,
          messageId: message.messageId,
          from: message.from,
          subject: message.subject,
          date: message.date,
          preview: message.preview,
          sortTime: message.sortTime,
          updatedAt: now,
        });
      }
    }

    for (const account of args.accounts) {
      const existing = await ctx.db
        .query("emailAccountSummaries")
        .withIndex("by_account_id", (queryBuilder) => queryBuilder.eq("accountId", account.id))
        .unique();

      if (existing) {
        await ctx.db.patch(existing._id, {
          email: account.email,
          messagesTotal: account.messagesTotal,
          threadsTotal: account.threadsTotal,
          updatedAt: now,
        });
      } else {
        await ctx.db.insert("emailAccountSummaries", {
          accountId: account.id,
          email: account.email,
          messagesTotal: account.messagesTotal,
          threadsTotal: account.threadsTotal,
          updatedAt: now,
        });
      }
    }
  },
});

export const getMessageDetail = query({
  args: {
    accountEmail: v.string(),
    messageId: v.string(),
  },
  handler: async (ctx, args) => {
    const cacheKey = `${args.accountEmail}:${args.messageId}`;

    const message = await ctx.db
      .query("emailMessages")
      .withIndex("by_cache_key", (queryBuilder) => queryBuilder.eq("cacheKey", cacheKey))
      .unique();

    if (!message) {
      return null;
    }

    return {
      id: `${message.accountEmail}:${message.messageId}`,
      messageId: message.messageId,
      accountEmail: message.accountEmail,
      from: message.from,
      subject: message.subject,
      date: message.date,
      preview: message.preview,
      bodyText: message.bodyText,
      bodyHtml: message.bodyHtml,
      body: message.body,
    };
  },
});

export const upsertMessageDetail = mutation({
  args: {
    accountEmail: v.string(),
    messageId: v.string(),
    from: v.string(),
    subject: v.string(),
    date: v.string(),
    preview: v.string(),
    bodyText: v.string(),
    bodyHtml: v.string(),
    body: v.string(),
    sortTime: v.number(),
  },
  handler: async (ctx, args) => {
    const cacheKey = `${args.accountEmail}:${args.messageId}`;
    const existing = await ctx.db
      .query("emailMessages")
      .withIndex("by_cache_key", (queryBuilder) => queryBuilder.eq("cacheKey", cacheKey))
      .unique();

    const payload = {
      accountEmail: args.accountEmail,
      messageId: args.messageId,
      from: args.from,
      subject: args.subject,
      date: args.date,
      preview: args.preview,
      bodyText: args.bodyText,
      bodyHtml: args.bodyHtml,
      body: args.body,
      sortTime: args.sortTime,
      updatedAt: Date.now(),
    };

    if (existing) {
      await ctx.db.patch(existing._id, payload);
      return;
    }

    await ctx.db.insert("emailMessages", {
      cacheKey,
      ...payload,
    });
  },
});
