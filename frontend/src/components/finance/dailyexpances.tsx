import { useState } from "react";
import { formatCurrencyUGX } from "./utils"; // we'll extract these

const mockBursaryData = [
  { id: 1, name: "Samuel T", type: "Academic Excellence", percentage: "100%", amountCovered: 1500000, term: "Term 1", status: "Approved" },
  { id: 2, name: "Sarah K", type: "Sports Scholarship", percentage: "50%", amountCovered: 525000, term: "Term 1", status: "Approved" },
  { id: 3, name: "David M", type: "Staff Dependent", percentage: "75%", amountCovered: 900000, term: "Term 1", status: "Pending Review" },
  { id: 4, name: "Alice W", type: "Needs-Based", percentage: "25%", amountCovered: 337500, term: "Term 1", status: "Approved" },
];

export function BursaryPage() {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredData = mockBursaryData.filter(d => 
    d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalBursaryAmount = filteredData
    .filter(d => d.status === "Approved")
    .reduce((acc, d) => acc + d.amountCovered, 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="neo-card p-6 border-t-4 border-[#10b981] flex flex-col justify-center">
          <h2 className="text-sm font-bold uppercase tracking-wider text-[#636e72]">Total Approved Disbursements</h2>
          <p className="mt-2 text-3xl font-black text-[#10b981]">{formatCurrencyUGX(totalBursaryAmount)}</p>
          <p className="mt-1 text-xs text-[#636e72]">Total fees subsidized by school for current term</p>
        </div>
        
        <div className="neo-card p-6 flex flex-col justify-center">
          <h2 className="text-sm font-bold uppercase tracking-wider text-[#636e72]">Active Recipients</h2>
          <p className="mt-2 text-3xl font-black text-[#4a6b4e]">{filteredData.filter(d => d.status === "Approved").length}</p>
          <p className="mt-1 text-xs text-[#636e72]">Students currently on scholarship or bursary</p>
        </div>
      </div>

      <div className="neo-card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#ebe4d9]/80 bg-[#faf7f0]/50 px-6 py-4">
          <h2 className="text-lg font-bold text-[#2d3436]">Bursary & Scholarship Awards</h2>
          <div className="w-full sm:w-72">
            <input
              type="text"
              placeholder="Search by student or type..."
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
                <th className="px-6 py-3">Student Name</th>
                <th className="px-6 py-3">Bursary Type</th>
                <th className="px-6 py-3 text-center">Subsidized %</th>
                <th className="px-6 py-3">Term</th>
                <th className="px-6 py-3 text-right">Amount Covered</th>
                <th className="px-6 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ebe4d9]">
              {filteredData.map((d) => (
                <tr key={d.id} className="transition hover:bg-[#faf7f0]/80">
                  <td className="px-6 py-4 font-bold text-[#2d3436] whitespace-nowrap">{d.name}</td>
                  <td className="px-6 py-4">{d.type}</td>
                  <td className="px-6 py-4 text-center font-semibold text-[#4a6b4e]">{d.percentage}</td>
                  <td className="px-6 py-4">{d.term}</td>
                  <td className="px-6 py-4 text-right font-medium">{formatCurrencyUGX(d.amountCovered)}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-xs font-bold ${
                      d.status === "Approved" ? "bg-[#d1fae5] text-[#047857]" : "bg-[#fef3c7] text-[#b45309]"
                    }`}>
                      {d.status}
                    </span>
                  </td>
                </tr>
              ))}
              {filteredData.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-sm text-[#636e72]">
                    No bursary records match your search criteria.
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
