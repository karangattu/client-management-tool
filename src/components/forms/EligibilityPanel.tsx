
"use client";

import { useState } from "react";
import { EligibilityResult } from "@/lib/eligibility";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    CheckCircle2,
    AlertCircle,
    Sparkles,
    ChevronRight,
    ChevronDown,
    ChevronUp,
    Info,
    LayoutGrid,
    Target
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface EligibilityPanelProps {
    results: EligibilityResult[];
    className?: string;
}

export function EligibilityPanel({ results, className }: EligibilityPanelProps) {
    const [showPotential, setShowPotential] = useState(false);

    const eligible = results.filter((r) => r.isEligible);
    const potential = results.filter((r) => r.isMaybe);

    if (results.length === 0) return (
        <Card className={cn("border-dashed border-2 bg-muted/30", className)}>
            <CardContent className="flex flex-col items-center justify-center py-10 text-center">
                <Target className="h-10 w-10 text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground px-4">
                    Enter more client details to see personalized benefit recommendations.
                </p>
            </CardContent>
        </Card>
    );

    return (
        <TooltipProvider>
            <Card className={cn("border border-slate-200 shadow-xl bg-gradient-to-br from-white to-slate-50/50 overflow-hidden", className)}>
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-primary to-purple-500" />

                <CardHeader className="pb-4 space-y-1">
                    <CardTitle className="flex items-center gap-2.5 text-xl font-bold tracking-tight">
                        <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                            <Sparkles className="h-5 w-5" />
                        </div>
                        Recommended
                    </CardTitle>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Info className="h-3.3 w-3.3" />
                        Based on current intake data
                    </p>
                </CardHeader>

                <CardContent className="space-y-6">
                    {/* Eligible Benefits */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                                <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                                Likely Eligible ({eligible.length})
                            </h4>
                        </div>

                        {eligible.length > 0 ? (
                            <div className="grid gap-3">
                                {eligible.map((r) => (
                                    <div
                                        key={r.programId}
                                        className="group relative flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200 hover:border-green-300 hover:shadow-md transition-all duration-300 cursor-default"
                                    >
                                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-green-500 opacity-0 group-hover:opacity-100 transition-opacity" />

                                        <div className="flex flex-col gap-1 pr-2 min-w-0 flex-1">
                                            <span className="text-sm font-semibold text-slate-900 leading-tight group-hover:text-green-700 transition-colors line-clamp-2">
                                                {r.programName}
                                            </span>
                                            {r.metConditions.length > 0 && (
                                                <div className="flex flex-wrap gap-1 mt-0.5">
                                                    <Badge variant="secondary" className="bg-green-50 text-[9px] text-green-700 border-none px-1.5 h-4">
                                                        {r.metConditions.length} criteria met
                                                    </Badge>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <div className="p-1.5 rounded-full bg-green-50 text-green-600">
                                                        <CheckCircle2 className="h-4 w-4" />
                                                    </div>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p className="text-xs font-medium">Eligible Match</p>
                                                </TooltipContent>
                                            </Tooltip>
                                            <ChevronRight className="h-4 w-4 text-slate-300 group-hover:translate-x-0.5 group-hover:text-green-500 transition-all" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-4 rounded-xl border border-dashed text-center">
                                <p className="text-xs text-muted-foreground italic">No full matches yet.</p>
                            </div>
                        )}
                    </div>

                    {/* Potential Matches - Toggle Section */}
                    {potential.length > 0 && (
                        <div className="pt-2 border-t border-slate-100">
                            <button
                                onClick={() => setShowPotential(!showPotential)}
                                className="flex items-center justify-between w-full hover:opacity-80 transition-opacity py-1 outline-none"
                                aria-expanded={showPotential}
                            >
                                <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                                    Potential ({potential.length})
                                </h4>
                                {showPotential ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                            </button>

                            {showPotential && (
                                <div className="space-y-3 pt-2 animate-in fade-in slide-in-from-top-1 duration-200">
                                    <div className="grid gap-2">
                                        {potential.map((r) => (
                                            <div
                                                key={r.programId}
                                                className="group flex items-center justify-between p-3 rounded-lg bg-slate-50/50 border border-slate-100 hover:bg-amber-50/30 transition-colors"
                                            >
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="text-xs font-medium text-slate-700">
                                                        {r.programName}
                                                    </span>
                                                    <span className="text-[10px] text-amber-600/80 font-medium">
                                                        Needs info
                                                    </span>
                                                </div>
                                                <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
                                            </div>
                                        ))}
                                    </div>
                                    <p className="text-[10px] text-muted-foreground italic leading-relaxed px-1">
                                        Complete the profile to confirm eligibility for these programs.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="pt-4 border-t border-slate-100 flex items-start gap-2">
                        <Info className="h-3 w-3 text-slate-400 mt-0.5 shrink-0" />
                        <p className="text-[9px] text-slate-400 leading-normal italic">
                            Recommendations are based on extracted rules and for screening purposes only. Official determination is made by agency staff.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </TooltipProvider>
    );
}
