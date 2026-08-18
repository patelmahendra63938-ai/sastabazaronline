'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, ShoppingCart, Package, Tags, Warehouse, 
  Users, Truck, CreditCard, Receipt, BarChart, MessageSquare, 
  Ticket, Plug, Settings, LogOut 
} from 'lucide-react';

const navItems = [
  { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
  { name: 'Orders', href: '/admin/orders', icon: ShoppingCart },
  { name: 'Products', href: '/admin/products', icon: Package },
  { name: 'Categories', href: '/admin/categories', icon: Tags },
  { name: 'Inventory', href: '/admin/inventory', icon: Warehouse },
  { name: 'Customers', href: '/admin/customers', icon: Users },
  { name: 'Shipping', href: '/admin/shipping', icon: Truck },
  { name: 'Payments', href: '/admin/payments', icon: CreditCard },
  { name: 'Invoices / GST', href: '/admin/invoices', icon: Receipt },
  { name: 'Reports', href: '/admin/reports', icon: BarChart },
  { name: 'Reviews', href: '/admin/reviews', icon: MessageSquare },
  { name: 'Coupons', href: '/admin/coupons', icon: Ticket },
  { name: 'Integrations', href: '/admin/integrations', icon: Plug },
  { name: 'Settings', href: '/admin/settings', icon: Settings },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-indigo-950 text-white flex flex-col h-full shadow-xl z-20 hidden md:flex">
      <div className="p-6 border-b border-indigo-900">
        <h2 className="text-xl font-black tracking-wider text-orange-500">ADMIN PANEL</h2>
      </div>
      
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1 custom-scrollbar">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link 
              key={item.name} 
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm font-medium ${
                isActive ? 'bg-indigo-600 text-white shadow-md' : 'text-indigo-200 hover:bg-indigo-900 hover:text-white'
              }`}
            >
              <item.icon size={18} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-indigo-900">
        <button className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-red-400 hover:bg-red-500/10 transition-all text-sm font-bold">
          <LogOut size={18} />
          Secure Logout
        </button>
      </div>
    </aside>
  );
}