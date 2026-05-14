import { getAccounts } from "../src/accounts";
import { runHeadsUp } from "../src/heads-up";
import { runOnce } from "../src/publisher";

async function main() {
  const accounts = getAccounts();
  if (accounts.length === 0) {
    throw new Error(
      "No accounts configured. Set ACCOUNTS or NOTION_DATABASE_ID + LINKEDIN_* in .env.",
    );
  }
  const results = [];
  for (const account of accounts) {
    const published = await runOnce(account);
    const headsUp = await runHeadsUp(account);
    results.push({ account: account.name, published, headsUp });
  }
  console.log(JSON.stringify(results, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
