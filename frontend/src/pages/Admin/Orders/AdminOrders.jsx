import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Eye,
  Package,
  RefreshCw,
  Truck,
  XCircle,
  Search,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import AdminLayout from '../../../components/admin/AdminLayout';
import api from '../../../services/api';
import { useToast } from '../../../context/ToastContext';

const steps = [
  'PLACED',
  'ACCEPTED',
  'PROCESSING',
  'PACKED',
  'SHIPPED',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
];

const label = (status) =>
  status === 'OUT_FOR_DELIVERY'
    ? 'Out for delivery'
    : status?.replaceAll('_', ' ') || 'Placed';

const formatDateTime = (value) => {
  if (!value) return 'Date unavailable';
  const date =
    typeof value?.toDate === 'function'
      ? value.toDate()
      : new Date(value);

  return Number.isNaN(date.getTime())
    ? 'Date unavailable'
    : date.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
};

const isToday = (value) => {
  if (!value) return false;

  const date =
    typeof value?.toDate === 'function'
      ? value.toDate()
      : new Date(value);

  const now = new Date();

  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
};

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  const { showToast } = useToast();

  async function load() {
    setLoading(true);

    try {
      const { data } = await api.get('/orders/admin/all');
      setOrders(Array.isArray(data) ? data : []);
    } catch (error) {
      showToast(
        error?.response?.data?.message ||
          'Unable to load orders.',
        'error'
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function change(id, status) {
    try {
      const { data } = await api.patch(
        `/orders/${id}/status`,
        { status }
      );

      setOrders((current) =>
        current.map((order) =>
          order.id === id
            ? {
                ...order,
                orderStatus:
                  data.orderStatus || status,
                updatedAt:
                  new Date().toISOString(),
              }
            : order
        )
      );

      showToast(
        status === 'REJECTED'
          ? 'Order rejected.'
          : `Order moved to ${label(status)}.`,
        status === 'REJECTED'
          ? 'error'
          : 'success'
      );
    } catch (error) {
      showToast(
        error?.response?.data?.message ||
          'Order cannot move backwards.',
        'error'
      );

      await load();
    }
  }

  const shown = useMemo(() => {
    const query = search
      .trim()
      .toLowerCase();

    let result = orders;

    if (filter === 'TODAY') {
      result = result.filter((order) =>
        isToday(
          order.orderDate ||
            order.createdAt
        )
      );
    }

    if (filter === 'ACTIVE') {
      result = result.filter(
        (order) =>
          ![
            'DELIVERED',
            'CANCELLED',
            'REJECTED',
          ].includes(order.orderStatus)
      );
    }

    if (query) {
      result = result.filter((order) => {
        const fullId =
          String(order.id || '')
            .toLowerCase();

        const shortId =
          String(order.id || '')
            .slice(-8)
            .toLowerCase();

        return (
          fullId.includes(query) ||
          shortId.includes(query) ||
          `#${shortId}`.includes(query)
        );
      });
    }

    return result;
  }, [orders, filter, search]);

  function nextFor(order) {
    if (order.orderStatus === 'REJECTED') {
      return '';
    }

    const index =
      steps.indexOf(order.orderStatus);

    return index >= 0
      ? steps[index + 1] || ''
      : '';
  }

  function orderActions(order) {
    const next = nextFor(order);

    if (order.orderStatus === 'PLACED') {
      return (
        <div className="flex flex-wrap gap-2">
          <button
            className="btn-primary !px-3 !py-2"
            onClick={() =>
              change(order.id, 'ACCEPTED')
            }
          >
            <CheckCircle2 size={15} />
            Accept
          </button>

          <button
            className="btn-secondary !border-red-200 !bg-red-50 !text-red-700 !px-3 !py-2"
            onClick={() =>
              change(order.id, 'REJECTED')
            }
          >
            <XCircle size={15} />
            Reject
          </button>

          <Link
            to={`/orders/${order.id}`}
            className="btn-secondary !px-3 !py-2"
          >
            <Eye size={15} />
            View
          </Link>
        </div>
      );
    }

    return (
      <div className="flex flex-wrap gap-2">
        {next ? (
          <button
            className="btn-primary !px-3 !py-2"
            onClick={() =>
              change(order.id, next)
            }
          >
            <Truck size={15} />
            Move to {label(next)}
          </button>
        ) : (
          <span className="status-pill status-ok">
            {order.orderStatus === 'REJECTED'
              ? 'Rejected'
              : 'Complete'}
          </span>
        )}

        <Link
          to={`/orders/${order.id}`}
          className="btn-secondary !px-3 !py-2"
        >
          <Eye size={15} />
          View
        </Link>
      </div>
    );
  }

  const orderCard = (order) => (
    <article
      key={order.id}
      className="admin-order-card"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <b className="block truncate">
            #{String(order.id)
              .slice(-8)
              .toUpperCase()}
          </b>

          <span className="mt-1 block text-xs text-stone-500">
            Order date:{' '}
            {formatDateTime(
              order.orderDate ||
                order.createdAt
            )}
          </span>

          <span className="mt-1 block text-xs font-semibold text-emerald-700">
            Expected:{' '}
            {formatDateTime(
              order.expectedDeliveryDate
            )}
          </span>
        </div>

        <span className="order-status shrink-0">
          {label(order.orderStatus)}
        </span>
      </div>

      <div className="mt-4 grid gap-3 text-sm">
        <div>
          <span className="text-xs text-stone-400">
            Customer
          </span>

          <b className="block">
            {order.profileSnapshot?.name ||
              'Customer'}
          </b>

          <span className="block break-all text-xs text-stone-500">
            {order.profileSnapshot?.email ||
              ''}
          </span>
        </div>

        <div>
          <span className="text-xs text-stone-400">
            Items
          </span>

          <b className="block break-words">
            {(order.items || [])
              .map(
                (item) =>
                  `${item.name} · ${item.weight} × ${item.quantity}`
              )
              .join(', ')}
          </b>
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-2">
          <span>
            <small className="text-stone-400">
              Payment:
            </small>{' '}
            <b>
              {order.paymentStatus ||
                'Verified'}
            </b>
          </span>

          <span>
            <small className="text-stone-400">
              Delivery:
            </small>{' '}
            <b>
              {order.deliveryMode ===
              'SUPERFAST'
                ? 'Super Fast'
                : 'Normal'}
            </b>
          </span>

          <span>
            <small className="text-stone-400">
              Total:
            </small>{' '}
            <b>₹{order.total}</b>
          </span>
        </div>
      </div>

      <div className="mt-4">
        {orderActions(order)}
      </div>
    </article>
  );

  return (
    <AdminLayout>
      <div className="admin-page-head">
        <div className="min-w-0">
          <p className="account-kicker">
            <Package size={14} />
            Fulfilment centre
          </p>

          <h1 className="mt-2 text-3xl font-black sm:text-4xl">
            Received Orders
          </h1>

          <p className="mt-2 max-w-2xl text-sm text-stone-500">
            Orders move forward one step at a
            time. Newly placed orders can be
            accepted or rejected.
          </p>
        </div>

        <button
          className="btn-secondary shrink-0"
          onClick={load}
          disabled={loading}
        >
          <RefreshCw
            size={16}
            className={
              loading
                ? 'animate-spin'
                : ''
            }
          />
          Refresh
        </button>
      </div>

      {/* Search + filters */}
      <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(240px,1fr)_auto]">
        <label className="relative block">
          <Search
            size={17}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
          />

          <input
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="Search by Order ID..."
            className="w-full rounded-xl border border-stone-200 bg-white py-3 pl-10 pr-4 text-sm font-semibold outline-none transition focus:border-achar-700 focus:ring-2 focus:ring-achar-700/10"
          />
        </label>

        <div className="flex flex-wrap gap-2">
          <button
            className={`admin-filter ${
              filter === 'ALL'
                ? 'active'
                : ''
            }`}
            onClick={() =>
              setFilter('ALL')
            }
          >
            All ({orders.length})
          </button>

          <button
            className={`admin-filter ${
              filter === 'ACTIVE'
                ? 'active'
                : ''
            }`}
            onClick={() =>
              setFilter('ACTIVE')
            }
          >
            Active (
            {
              orders.filter(
                (order) =>
                  ![
                    'DELIVERED',
                    'CANCELLED',
                    'REJECTED',
                  ].includes(
                    order.orderStatus
                  )
              ).length
            }
            )
          </button>

          <button
            className={`admin-filter ${
              filter === 'TODAY'
                ? 'active'
                : ''
            }`}
            onClick={() =>
              setFilter('TODAY')
            }
          >
            Today's Orders (
            {
              orders.filter((order) =>
                isToday(
                  order.orderDate ||
                    order.createdAt
                )
              ).length
            }
            )
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="admin-stat-card">
          <span>Total orders</span>
          <b>{orders.length}</b>
        </div>

        <div className="admin-stat-card">
          <span>To process</span>
          <b>
            {
              orders.filter(
                (order) =>
                  ![
                    'DELIVERED',
                    'CANCELLED',
                    'REJECTED',
                  ].includes(
                    order.orderStatus
                  )
              ).length
            }
          </b>
        </div>

        <div className="admin-stat-card col-span-2 sm:col-span-1">
          <span>Today's orders</span>
          <b>
            {
              orders.filter((order) =>
                isToday(
                  order.orderDate ||
                    order.createdAt
                )
              ).length
            }
          </b>
        </div>
      </div>

      {/* Desktop */}
      <div className="mt-6 hidden lg:block card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead className="bg-stone-50">
              <tr>
                <th className="p-4">Order</th>
                <th className="p-4">Customer</th>
                <th className="p-4">Products</th>
                <th className="p-4">Payment</th>
                <th className="p-4">Delivery</th>
                <th className="p-4">Total</th>
                <th className="p-4">Action</th>
              </tr>
            </thead>

            <tbody>
              {shown.map((order) => (
                <tr
                  key={order.id}
                  className="border-t align-top"
                >
                  <td className="p-4">
                    <b>
                      #
                      {String(order.id)
                        .slice(-8)
                        .toUpperCase()}
                    </b>

                    <span className="mt-1 block text-xs text-stone-500">
                      {formatDateTime(
                        order.orderDate ||
                          order.createdAt
                      )}
                    </span>

                    <span className="mt-1 block text-xs font-semibold text-emerald-700">
                      Expected:{' '}
                      {formatDateTime(
                        order.expectedDeliveryDate
                      )}
                    </span>
                  </td>

                  <td className="max-w-[180px] p-4">
                    <b>
                      {order.profileSnapshot
                        ?.name ||
                        'Customer'}
                    </b>

                    <span className="mt-1 block break-all text-xs text-stone-500">
                      {order.profileSnapshot
                        ?.email || ''}
                    </span>
                  </td>

                  <td className="max-w-[250px] p-4">
                    {(order.items || []).map(
                      (item, index) => (
                        <div
                          key={`${item.productId || item.name}-${index}`}
                          className="mb-1"
                        >
                          {item.name} ·{' '}
                          {item.weight} ×{' '}
                          {item.quantity}
                        </div>
                      )
                    )}
                  </td>

                  <td className="p-4">
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                      <CheckCircle2
                        size={13}
                      />
                      {order.paymentStatus}
                    </span>
                  </td>

                  <td className="p-4">
                    <b>
                      {order.deliveryMode ===
                      'SUPERFAST'
                        ? 'Super Fast'
                        : 'Normal'}
                    </b>

                    <span className="mt-1 block text-xs text-stone-500">
                      ₹{order.shipping || 0}{' '}
                      · GST ₹
                      {order.gst || 0}
                    </span>
                  </td>

                  <td className="p-4 font-black">
                    ₹{order.total}
                  </td>

                  <td className="p-4">
                    {orderActions(order)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile / tablet */}
      <div className="mt-6 grid gap-3 lg:hidden">
        {shown.length ? (
          shown.map(orderCard)
        ) : (
          <div className="empty-account">
            {loading
              ? 'Loading orders…'
              : search
                ? 'No order matches that Order ID.'
                : 'No orders in this view.'}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
