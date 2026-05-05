import { Checkbox } from "@/components/ui/checkbox";
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
            // remove day and all its slots
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
                    {daysOfWeek.map((day) => (
                        <div
                            key={day}
                            className={`flex items-center space-x-2 p-3 rounded-lg border transition-all cursor-pointer ${selectedDays.includes(day)
                                ? "bg-emerald-50 border-emerald-300"
                                : "bg-white border-slate-200 hover:border-slate-300"
                                }`}
                        >
                            <Checkbox
                                id={`day-${day}`}
                                checked={selectedDays.includes(day)}
                                onCheckedChange={() => handleDayToggle(day)}
                            />
                            <Label
                                htmlFor={`day-${day}`}
                                className="text-sm font-medium cursor-pointer flex-1 py-1"
                            >
                                {day.slice(0, 3)}
                            </Label>
                        </div>
                    ))}
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
                                <div className="flex items-center gap-2 mb-3">
                                    <Clock className="w-4 h-4 text-emerald-600" />
                                    <span className="font-semibold text-slate-700">{day}</span>
                                    {daySlots.length > 0 && (
                                        <div className="flex gap-1 flex-wrap ml-2">
                                            {daySlots.map(slot => (
                                                <Badge key={slot} className="bg-emerald-100 text-emerald-800 text-xs">
                                                    {slot}
                                                </Badge>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                    {timeSlotOptions.map((slot) => {
                                        const isSelected = selectedTimeSlots.includes(encodeSlot(day, slot))
                                        return (
                                            <div
                                                key={slot}
                                                className={`flex items-center space-x-2 p-2 rounded-lg border transition-all cursor-pointer ${isSelected
                                                    ? "bg-emerald-50 border-emerald-300"
                                                    : "bg-white border-slate-200 hover:border-slate-300"
                                                    }`}
                                            >
                                                <Checkbox
                                                    id={`slot-${day}-${slot}`}
                                                    checked={isSelected}
                                                    onCheckedChange={() => handleSlotToggle(day, slot)}
                                                />
                                                <Label
                                                    htmlFor={`slot-${day}-${slot}`}
                                                    className="text-xs font-medium cursor-pointer flex-1"
                                                >
                                                    {slot}
                                                </Label>
                                            </div>
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
