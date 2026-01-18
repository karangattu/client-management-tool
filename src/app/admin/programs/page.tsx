'use client';

import { useState, useEffect } from 'react';
import { AppHeader } from '@/components/layout/AppHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Settings } from 'lucide-react';
import Link from 'next/link';
import { getPrograms, Program } from '@/app/actions/programs';

export default function AdminProgramsPage() {
    const [programs, setPrograms] = useState<Program[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        async function loadPrograms() {
            const result = await getPrograms();
            if (result.success && result.data) {
                setPrograms(result.data);
            }
            setLoading(false);
        }
        loadPrograms();
    }, []);

    const filteredPrograms = programs.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-gray-50">
            <AppHeader title="Manage Programs" showBackButton />

            <main className="container px-4 py-6">
                <div className="flex flex-col md:flex-row gap-4 mb-6 justify-between items-center">
                    <div className="relative flex-1 max-w-md w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            placeholder="Search programs..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <Skeleton key={i} className="h-40" />
                        ))}
                    </div>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {filteredPrograms.map((program) => (
                            <Card key={program.id} className="hover:border-blue-200 hover:shadow-sm transition-all">
                                <CardHeader className="pb-2">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full mb-2 inline-block">
                                                {program.category}
                                            </span>
                                            <CardTitle className="text-lg">{program.name}</CardTitle>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-gray-500 line-clamp-2 mb-4 h-10">
                                        {program.description || "No description provided."}
                                    </p>
                                    <Link href={`/admin/programs/${program.id}`}>
                                        <Button className="w-full bg-white text-gray-900 border hover:bg-gray-50">
                                            <Settings className="h-4 w-4 mr-2" />
                                            Configure Tasks
                                        </Button>
                                    </Link>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
