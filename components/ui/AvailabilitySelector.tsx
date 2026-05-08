import { Label } from "@/components/ui/label";
import { daysOfWeek, timeSlotOptions } from "@/lib/mockData";
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";

interface AvailabilitySelectorProps {
    selectedDays: string[];
    selectedTimeSlots: string[];
    onDaysChange: (days: string[]) => void;
    onTimeSlotsChange: (slots: string[]) => void;
}

// Helper — parse "Monday:7:00-8:00" → { day, slot }
export function parseSlot(encoded: string): { day: string; slot: string } {
    const [day, ...rest] = encoded.split(":")
    return { day, slot: rest.join(":") }
}

// Helper — encode day + slot → "Monday:7:00-8:00"
export function encodeSlot(day: string, slot: string): string {
    return `${day}:${slot}`
}

// Get all slots for a specific day from the encoded array
function getSlotsForDay(day: string, selectedSlots: string[]): string[] {
    return selectedSlots
        .filter(s => s.startsWith(`${day}:`))
        .map(s => parseSlot(s).slot)
}

export function AvailabilitySelector({
    selectedDays,
    selectedTimeSlots,
    onDaysChange,
    onTimeSlotsChange,
}: AvailabilitySelectorProps) {

    const handleDayToggle = (day: string) => {
        if (selectedDays.includes(day)) {
            onDaysChange(selectedDays.filter(d => d !== day))
            onTimeSlotsChange(selectedTimeSlots.filter(s => !s.startsWith(`${day}:`)))
        } else {
            onDaysChange([...selectedDays, day])
        }
    }

    const handleSlotToggle = (day: string, slot: string) => {
        const encoded = encodeSlot(day, slot)
        if (selectedTimeSlots.includes(encoded)) {
            onTimeSlotsChange(selectedTimeSlots.filter(s => s !== encoded))
        } else {
            onTimeSlotsChange([...selectedTimeSlots, encoded])
        }
    }

    return (
        <div className="space-y-6">
            {/* Days of the Week */}
            <div className="space-y-3">
                <Label className="text-base font-semibold text-slate-700">
                    Available Days
                </Label>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                    {daysOfWeek.map((day) => {
                        const checked = selectedDays.includes(day)
                        return (
                            <label
                                key={day}
                                className={`flex items-center gap-2 p-3 rounded-lg border transition-colors cursor-pointer select-none ${
                                    checked
                                        ? "bg-emerald-50 border-emerald-300"
                                        : "bg-white border-slate-200 hover:border-slate-300"
                                }`}
                            >
                                <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => handleDayToggle(day)}
                                    className="w-4 h-4 rounded accent-emerald-600 shrink-0"
                                />
                                <span className="text-sm font-medium">{day.slice(0, 3)}</span>
                            </label>
                        )
                    })}
                </div>
            </div>

            {/* Per-day time slot selection */}
            {selectedDays.length > 0 && (
                <div className="space-y-4">
                    <Label className="text-base font-semibold text-slate-700">
                        Preferred Time Slots per Day
                    </Label>
                    {selectedDays.map((day) => {
                        const daySlots = getSlotsForDay(day, selectedTimeSlots)
                        return (
                            <div key={day} className="border rounded-lg p-4 bg-white">
                                <div className="flex items-center gap-2 mb-3 flex-wrap">
                                    <Clock className="w-4 h-4 text-emerald-600 shrink-0" />
                                    <span className="font-semibold text-slate-700">{day}</span>
                                    {daySlots.map(slot => (
                                        <Badge key={slot} className="bg-emerald-100 text-emerald-800 text-xs">
                                            {slot}
                                        </Badge>
                                    ))}
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                    {timeSlotOptions.map((slot) => {
                                        const isSelected = selectedTimeSlots.includes(encodeSlot(day, slot))
                                        return (
                                            <label
                                                key={slot}
                                                className={`flex items-center gap-2 p-2 rounded-lg border transition-colors cursor-pointer select-none ${
                                                    isSelected
                                                        ? "bg-emerald-50 border-emerald-300"
                                                        : "bg-white border-slate-200 hover:border-slate-300"
                                                }`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => handleSlotToggle(day, slot)}
                                                    className="w-4 h-4 rounded accent-emerald-600 shrink-0"
                                                />
                                                <span className="text-xs font-medium">{slot}</span>
                                            </label>
                                        )
                                    })}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {selectedDays.length === 0 && (
                <p className="text-sm text-slate-400 italic">
                    Select days above to choose time slots for each day.
                </p>
            )}
        </div>
    )
}
