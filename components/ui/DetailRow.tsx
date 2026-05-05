type DetailRowProps = {
    icon: React.ReactNode;
    label: string;
    value: string
    stud_no: number;
    href?: string
}

export function DetailRow({ icon, label, value, href, stud_no }: DetailRowProps) {
    const isEmpty = !value.trim();
    return (
        <div className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50/50 px-4 py-3">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white text-slate-500 shadow-sm ring-1 ring-slate-200">
                {icon}
            </div>
            <div className="min-w-0 flex-1">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    {label}
                </p>
                {isEmpty ? (
                    <p className="mt-0.5 text-sm italic text-slate-400">Not set</p>
                ) : href ? (
                    <a
                        href={href}
                        className="mt-0.5 block truncate text-sm font-medium text-slate-900 hover:text-blue-600"
                    >
                        {`${value} - ${stud_no}`}
                    </a>
                ) : (
                    <p className="mt-0.5 break-words text-sm font-medium text-slate-900">
                        {`${value} - ${stud_no}`}
                    </p>
                )}
            </div>
        </div>
    );
}

