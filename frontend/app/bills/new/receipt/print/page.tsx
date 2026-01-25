"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export default function PrintReceipt() {
  const searchParams = useSearchParams();
  const billId = searchParams.get("id");
  const [bill, setBill] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchBill() {
      if (!billId) return;
      setLoading(true);
      const res = await fetch(`/backend/bills.php`);
      const bills = await res.json();
      const found = bills.find((b: any) => b.bill_id.toString() === billId);
      setBill(found);
      setLoading(false);
    }
    fetchBill();
  }, [billId]);

  if (loading || !bill) return <div style={{padding: 40, fontSize: 18}}>Loading receipt...</div>;

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', fontFamily: 'monospace', padding: 24 }}>
      <Button onClick={() => window.print()} style={{ marginBottom: 16 }}>Print</Button>
      <h2 style={{ textAlign: 'center', fontWeight: 'bold', fontSize: 22, marginBottom: 8 }}>MeroMart Receipt</h2>
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <div>Bill No: <b>{bill.bill_number}</b></div>
        <div>Date: {new Date(bill.date_time).toLocaleString()}</div>
        <div>Customer: {bill.customer_name}</div>
        {bill.customer_phone && <div>Phone: {bill.customer_phone}</div>}
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
        <thead>
          <tr>
            <th style={{ borderBottom: '1px solid #000', textAlign: 'left' }}>Item</th>
            <th style={{ borderBottom: '1px solid #000', textAlign: 'right' }}>Qty</th>
            <th style={{ borderBottom: '1px solid #000', textAlign: 'right' }}>Rate</th>
            <th style={{ borderBottom: '1px solid #000', textAlign: 'right' }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {bill.items.map((item: any, idx: number) => (
            <tr key={idx}>
              <td>{item.product_name}</td>
              <td style={{ textAlign: 'right' }}>{item.quantity}</td>
              <td style={{ textAlign: 'right' }}>{formatCurrency(item.price)}</td>
              <td style={{ textAlign: 'right' }}>{formatCurrency(item.total_price)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span>Subtotal:</span>
        <span>{formatCurrency(bill.subtotal)}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span>Discount:</span>
        <span>-{formatCurrency(bill.discount)}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span>VAT ({bill.vat_rate}%):</span>
        <span>{formatCurrency(bill.vat_amount)}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: 18, marginTop: 8 }}>
        <span>Total:</span>
        <span>{formatCurrency(bill.net_amount)}</span>
      </div>
      <div style={{ marginTop: 16, textAlign: 'center', fontSize: 14 }}>
        <div>Payment: {bill.payment_method}</div>
        <div>Status: {bill.status}</div>
        {bill.notes && <div>Notes: {bill.notes}</div>}
        <div style={{ marginTop: 12 }}>Thank you for shopping with us!</div>
      </div>
    </div>
  );
} 