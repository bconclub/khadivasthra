import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Panel | Khadi Vasthra",
  description: "Manage products, categories, and store settings for Khadi Vasthra",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Admin layout without main site header/footer
  return (
    <div className="admin-layout">
      {children}
    </div>
  );
}
