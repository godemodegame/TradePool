import { SuiClient } from '@mysten/sui/client';

const POOL_ID = '0xc274fa1be156651a34e79b85611a5029b1e376ed796cdb3b49d8a6e3e74f0e84';
const PACKAGE_ID = '0x43a23c1d037b195652d1141d87087119f946b8691cb2fbc495cb7e68d6bd1429';

export async function checkPoolTransactions() {
  const client = new SuiClient({ url: 'https://fullnode.testnet.sui.io:443' });

  try {
    // Get pool object
    console.log('\n=== POOL INFORMATION ===');
    const pool = await client.getObject({
      id: POOL_ID,
      options: {
        showContent: true,
        showPreviousTransaction: true,
      },
    });

    console.log('Pool:', pool);

    if (pool.data?.content && 'fields' in pool.data.content) {
      const fields = pool.data.content.fields as any;
      console.log('\nPool State:');
      console.log('- SUI Balance:', fields.sui_balance);
      console.log('- Token Balance:', fields.token_balance);
      console.log('- Total Shares:', fields.total_shares);
      console.log('- Name:', fields.name);
    }

    // Get recent transactions for the pool
    console.log('\n=== RECENT TRANSACTIONS ===');
    const txs = await client.queryTransactionBlocks({
      filter: {
        InputObject: POOL_ID,
      },
      options: {
        showEffects: true,
        showInput: true,
        showEvents: true,
      },
      limit: 10,
    });

    console.log(`Found ${txs.data.length} transactions`);

    txs.data.forEach((tx, idx) => {
      console.log(`\nTransaction ${idx + 1}:`);
      console.log('- Digest:', tx.digest);
      console.log('- Sender:', tx.transaction?.data.sender);

      // Check for created objects (LP receipts)
      const created = tx.effects?.created;
      if (created && created.length > 0) {
        console.log('- Created objects:');
        created.forEach(obj => {
          console.log(`  * ${obj.reference.objectId} (${obj.owner})`);
        });
      }

      // Check events
      if (tx.events && tx.events.length > 0) {
        console.log('- Events:');
        tx.events.forEach(event => {
          console.log(`  * Type: ${event.type}`);
          console.log(`    Data:`, event.parsedJson);
        });
      }
    });

  } catch (error) {
    console.error('Error:', error);
  }
}

// Run if called directly
if (typeof window !== 'undefined') {
  (window as any).checkPool = checkPoolTransactions;
}
