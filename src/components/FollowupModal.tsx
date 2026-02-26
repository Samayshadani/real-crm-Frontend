// import { useState } from "react";
// import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Lead } from "@/pages/Leads";

// export default function FollowupModal({
//   lead,
//   onClose,
//   onSchedule
// }: {
//   lead: Lead;
//   onClose: () => void;
//   onSchedule: (updated: Lead) => void;
// }) {
//   const [date, setDate] = useState(lead.followUp || "");

//   function handleSchedule() {
//     onSchedule({ ...lead, followUp: date });
//     onClose();
//   }

//   return (
//     <Dialog open onOpenChange={onClose}>
//       <DialogTitle>Schedule Follow-Up for {lead.name}</DialogTitle>
//       <DialogContent>
//         <Input
//           type="date"
//           value={date}
//           onChange={e => setDate(e.target.value)}
//         />
//         <Button onClick={handleSchedule} disabled={!date}>Save</Button>
//       </DialogContent>
//     </Dialog>
//   );
// }


//testing


import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lead } from "@/pages/Leads";

// ✅ FIX: Extract just "YYYY-MM-DD" from any followUp string
// Handles: "2026-02-28", "2026-02-28T09:00:00", "2026-02-27T18:30:00.000Z"
function extractDateOnly(followUp: string | undefined | null): string {
  if (!followUp || followUp.trim() === "") return "";
  const s = followUp.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  if (s.includes("T")) return s.slice(0, 10);
  if (s.includes(" ")) return s.slice(0, 10);
  return s.slice(0, 10);
}

export default function FollowupModal({
  lead,
  onClose,
  onSchedule,
}: {
  lead: Lead;
  onClose: () => void;
  onSchedule: (updated: Lead) => void;
}) {
  // ✅ FIX: Always initialize with date-only string so the date input shows correctly
  const [date, setDate] = useState(extractDateOnly(lead.followUp));

  function handleSchedule() {
    if (!date) return;
    // ✅ FIX: Send just the date string "YYYY-MM-DD" — no time, no timezone issues
    onSchedule({ ...lead, followUp: date });
    onClose();
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogTitle>Schedule Follow-Up for {lead.name}</DialogTitle>
      <DialogContent>
        <div className="space-y-4 pt-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Follow-up Date</label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              min={new Date().toISOString().slice(0, 10)}
            />
          </div>
          {date && (
            <p className="text-sm text-blue-600">
              📅 Scheduled for: <strong>{date}</strong>
            </p>
          )}
          <div className="flex gap-3">
            <Button onClick={handleSchedule} disabled={!date} className="flex-1">
              Save Follow-up
            </Button>
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
