import type { RowDataPacket } from 'mysql2/promise'
import { getPool } from '../db/pool.js'
import { readPayload } from './adminSnapshotStore.js'

const DEV_ORDERS = {
  orders: [
    {
      id: 'order-seed-1',
      orderNumber: 'BUL-10042',
      createdAt: '2026-03-10',
      deliveryDate: '2026-03-18',
      shippingDate: '2026-03-16',
      customerName: 'Петров Иван',
      clientId: 'client-seed-1',
      clientEmail: 'ivan.petrov@example.com',
      total: '12 500 BYN',
      status: 'Отправка',
      paymentStatus: 'paid',
      paymentMethod: 'card',
      stageId: 'shipping',
      trackingNumber: '10123456789012',
      trackingUrl: 'https://www.pochta.ru/tracking',
      items: [
        { id: 'li-seed-a', name: 'Куртка зимняя', size: 'M', color: 'Чёрный', quantity: 1, price: '8 900 BYN' },
        { id: 'li-seed-b', name: 'Шапка вязаная', size: '—', color: 'Бежевый', quantity: 2, price: '1 800 BYN' },
      ],
      comment: 'Доставка СДЭК',
    },
    {
      id: 'order-seed-2',
      orderNumber: 'BUL-10043',
      createdAt: '2026-03-28',
      deliveryDate: '2026-04-05',
      customerName: 'Соколова Мария',
      clientId: 'client-seed-2',
      clientEmail: 'maria.sokolova@example.com',
      total: '48 900 BYN',
      status: 'Сборка',
      paymentStatus: 'unpaid',
      paymentMethod: 'unspecified',
      stageId: 'assembly',
      items: [
        { id: 'li-seed-c', name: 'Пальто шерстяное', size: 'L', color: 'Серый', quantity: 1, price: '42 000 BYN' },
      ],
    },
  ],
}

const DEV_CLIENTS = {
  clients: [
    {
      id: 'client-seed-1',
      firstName: 'Иван',
      lastName: 'Петров',
      email: 'ivan.petrov@example.com',
      phone: '+7 (999) 123-45-67',
    },
    {
      id: 'client-seed-2',
      firstName: 'Мария',
      lastName: 'Соколова',
      email: 'maria.sokolova@example.com',
      phone: '+7 (495) 000-11-22',
    },
  ],
}

async function snapshotArrayLength(table: string, key: string): Promise<number> {
  const pool = getPool()
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT payload FROM \`${table}\` WHERE id = 1 LIMIT 1`,
  )
  const row = rows[0] as { payload?: unknown } | undefined
  const payload = readPayload(row)
  if (!payload || typeof payload !== 'object') return 0
  const arr = (payload as Record<string, unknown>)[key]
  return Array.isArray(arr) ? arr.length : 0
}

async function upsertSnapshot(table: string, body: unknown): Promise<void> {
  const json = JSON.stringify(body)
  const pool = getPool()
  await pool.query(
    `INSERT INTO \`${table}\` (id, payload) VALUES (1, ?)
     ON DUPLICATE KEY UPDATE payload = VALUES(payload), updated_at = CURRENT_TIMESTAMP`,
    [json],
  )
}

/** В development заполняет пустые заказы и клиентов для демо-входа по email. */
export async function seedDevAdminSnapshotsIfEmpty(): Promise<void> {
  const ordersN = await snapshotArrayLength('admin_orders_snapshot', 'orders')
  if (ordersN === 0) {
    await upsertSnapshot('admin_orders_snapshot', DEV_ORDERS)
    console.log(`[bulai-shop-api] dev seed: admin orders (${DEV_ORDERS.orders.length})`)
  }

  const clientsN = await snapshotArrayLength('admin_clients_snapshot', 'clients')
  if (clientsN === 0) {
    await upsertSnapshot('admin_clients_snapshot', DEV_CLIENTS)
    console.log(`[bulai-shop-api] dev seed: admin clients (${DEV_CLIENTS.clients.length})`)
  }
}
