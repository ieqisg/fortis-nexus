export function ProfileField({
    icon,
    label,
    value,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
}) {
    return (
        <div className="flex gap-3">
            {/* Icon column — fixed width so it never shifts regardless of text length */}
            <div className="mt-0.5 shrink-0 text-slate-400">{icon}</div>

            {/* Text column */}
            <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-slate-500">{label}</p>
                <p className="mt-0.5 break-words text-sm text-slate-900">{value}</p>
            </div>
        </div>
    );
}
