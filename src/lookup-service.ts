import { CrooClient } from './croo/client';

/**
 * Look up the serviceId for an order you already completed.
 *
 * Usage: ENV_FILE=.env.contractor npx ts-node src/lookup-service.ts <orderId>
 *
 * If the orderId is forbidden, run without args to list your recent completed orders:
 *   ENV_FILE=.env.contractor npx ts-node src/lookup-service.ts
 */
async function main() {
  const client = new CrooClient();
  const orderId = process.argv[2];

  if (!orderId) {
    // List recent completed orders to find the serviceId
    const orders = (await client.agent.listOrders({ role: 'buyer', status: 'completed', limit: 10 } as any)) as any;
    const list = Array.isArray(orders) ? orders : orders.items ?? orders.data ?? [];
    console.log('Recent completed orders as requester:');
    for (const o of list) {
      console.log('---');
      console.log('Order ID:', o.id ?? o.order_id);
      console.log('Service ID:', o.service_id ?? o.serviceId ?? o.service?.id ?? 'n/a');
      console.log('Service Name:', o.service?.name ?? o.service_name ?? 'n/a');
      console.log('Provider:', o.provider?.name ?? o.providerName ?? 'n/a');
      console.log('Price:', o.price ?? o.service?.price ?? 'n/a');
    }
    return;
  }

  const order = (await client.agent.getOrder(orderId)) as any;
  console.log('Order ID:', orderId);
  console.log('Service ID:', order.service_id ?? order.serviceId ?? order.service?.id ?? 'not found');
  console.log('Service Name:', order.service?.name ?? order.service_name ?? 'n/a');
  console.log('Provider:', order.provider?.name ?? order.providerName ?? 'n/a');
  console.log('Price:', order.price ?? order.service?.price ?? 'n/a');
  console.log('Full order:', JSON.stringify(order, null, 2));
}

main().catch((err) => {
  console.error('lookup failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
