import { useState } from "react";
import { formatCurrencyUGX } from "./utils"; // we'll extract these

const mockStaffPayments = [
  { id: 1, name: "Alice Administrator", role: "Head Teacher", month: "April 2026", baseSalary: 1500000, allowances: 200000, deductions: 50000, netPay: 1650000, status: "Paid" },
  { id: 2, name: "Bob Teacher", role: "Class Teacher", month: "April 2026", baseSalary: 800000, allowances: 100000, deductions: 0, netPay: 900000, status: "Pending" },
  { id: 3, name: "Charlie Cashier", role: "Accounts/Bursar", month: "April 2026", baseSalary: 900000, allowances: 150000, deductions: 20000, netPay: 1030000, status: "Paid" },
  { id: 4, name: "Diana Support", role: "Librarian", month: "April 2026", baseSalary: 600000, allowances: 50000, deductions: 0, netPay: 650000, status: "Pending" },
];

export function StaffPaymentPage() {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredData = mockStaffPayments.filter(d => 
    d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPayroll = mockStaffPayments.reduce((acc, d) => acc + d.netPay, 0);
  const totalPaid = mockStaffPayments.filter(d => d.status === "Paid").reduce((acc, d) => acc + d.netPay, 0);
  const totalPending = totalPayroll - totalPaid;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="neo-card p-5 border-t-4 border-[#4a6b4e]">
          <p className="text-xs font-bold uppercase tracking-wider text-[#636e72]">Total Payroll (Apr 2026)</p>
          <p className="mt-2 text-2xl font-black text-[#4a6b4e]">{formatCurrencyUGX(totalPayroll)}</p>
        </div>
        <div className="neo-card p-5 border-t-4 border-[#10b981]">
          <p className="text-xs font-bold uppercase tracking-wider text-[#636e72]">Amount Disbursed</p>
          <p className="mt-2 text-2xl font-black text-[#10b981]">{formatCurrencyUGX(totalPaid)}</p>
        </div>
        <div className="neo-card p-5 border-t-4 border-[#4a6f8a]">
          <p className="text-xs font-bold uppercase tracking-wider text-[#636e72]">Pending Payments</p>
          <p className="mt-2 text-2xl font-black text-[#4a6f8a]">{formatCurrencyUGX(totalPending)}</p>
        </div>
      </div>

      <div className="neo-card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#ebe4d9]/80 bg-[#faf7f0]/50 px-6 py-4">
          <h2 className="text-lg font-bold text-[#2d3436]">Staff Payroll Records</h2>
          <div className="w-full sm:w-72">
            <input
              type="text"
              placeholder="Search staff by name or role..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="neo-inset-field w-full rounded-lg px-3 py-2 text-sm text-[#2d3436] placeholder:text-[#636e72]/70"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-[#3f4f67]">
            <thead className="bg-[#f5f8f5] text-xs font-bold uppercase text-[#4a6b4e]">
              <tr>
                <th className="px-6 py-3">Staff Member</th>
                <th className="px-6 py-3">Role</th>
                <th className="px-6 py-3 text-right">Base Salary</th>
                <th className="px-6 py-3 text-right">Net Pay</th>
                <th className="px-6 py-3 text-center">Status</th>
                <th className="px-6 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ebe4d9]">
              {filteredData.map((d) => (
                <tr key={d.id} className="transition hover:bg-[#faf7f0]/80">
                  <td className="px-6 py-4 font-bold text-[#2d3436] whitespace-nowrap">{d.name}</td>
                  <td className="px-6 py-4">{d.role}</td>
                  <td className="px-6 py-4 text-right font-medium">{formatCurrencyUGX(d.baseSalary)}</td>
                  <td className="px-6 py-4 text-right font-bold text-[#4a6b4e]">{formatCurrencyUGX(d.netPay)}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-xs font-bold ${
                      d.status === "Paid" ? "bg-[#d1fae5] text-[#047857]" : "bg-[#fef3c7] text-[#b45309]"
                    }`}>
                      {d.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button className="text-[#4a6f8a] hover:text-[#4a6f8a] font-semibold text-xs border rounded-md px-2 py-1 border-[#4a6f8a] hover:bg-[#4a6f8a] transition">
                      View Slip
                    </button>
                  </td>
                </tr>
              ))}
              {filteredData.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-sm text-[#636e72]">
                    No staff records match your search criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
