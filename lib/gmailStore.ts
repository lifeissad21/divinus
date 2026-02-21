export type GmailAccount = {
  id: string;
  email: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
};

declare global {
  var __gmailAccountsStore: GmailAccount[] | undefined;
}

const gmailAccounts = globalThis.__gmailAccountsStore ?? [];

if (!globalThis.__gmailAccountsStore) {
  globalThis.__gmailAccountsStore = gmailAccounts;
}

export function getGmailAccounts(): GmailAccount[] {
  return gmailAccounts;
}

export function getGmailAccountByEmail(email: string): GmailAccount | undefined {
  return gmailAccounts.find((account) => account.email.toLowerCase() === email.toLowerCase());
}

export function addOrUpdateGmailAccount(account: GmailAccount): GmailAccount {
  const index = gmailAccounts.findIndex((stored) => stored.email.toLowerCase() === account.email.toLowerCase());
  if (index >= 0) {
    gmailAccounts[index] = account;
    return gmailAccounts[index];
  }

  gmailAccounts.push(account);
  return account;
}

export function removeGmailAccountByEmail(email: string): void {
  const index = gmailAccounts.findIndex((account) => account.email.toLowerCase() === email.toLowerCase());
  if (index >= 0) {
    gmailAccounts.splice(index, 1);
  }
}