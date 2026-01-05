'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppHeader } from '@/components/layout/AppHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Users,
  UserPlus,
  Shield,
  MoreVertical,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Info,
  Archive,
  Key,
  Trash2,
} from 'lucide-react';
import { useAuth, UserRole } from '@/lib/auth-context';
import { createUser, archiveUser, getAllUsers } from '@/app/actions/users';
import { deleteUserAndData } from '@/app/actions/user-deletion';


interface UserProfile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  last_sign_in?: string;
}

const roleDescriptions: Record<UserRole, { title: string; description: string; color: string }> = {
  admin: {
    title: 'Administrator',
    description: 'Full access to all features, user management, and system settings',
    color: 'bg-purple-100 text-purple-800',
  },
  case_manager: {
    title: 'Case Manager',
    description: 'Manage clients, create/claim tasks, access housing and documents',
    color: 'bg-blue-100 text-blue-800',
  },
  staff: {
    title: 'Staff',
    description: 'Create intakes, manage assigned clients, basic document access',
    color: 'bg-green-100 text-green-800',
  },
  volunteer: {
    title: 'Volunteer',
    description: 'View clients, claim open tasks, limited document access',
    color: 'bg-yellow-100 text-yellow-800',
  },
  client: {
    title: 'Client',
    description: 'View own case, upload documents, self-service features',
    color: 'bg-gray-100 text-gray-800',
  },
};

export default function AdminPage() {
  const { profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    role: 'staff' as UserRole,
  });

  useEffect(() => {
    if (authLoading) return;

    if (!profile || profile.role !== 'admin') {
      if (profile) router.push('/dashboard');
      return;
    }

    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, authLoading]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const result = await getAllUsers();
      if (result.success && result.data) {
        setUsers(result.data);
      } else {
        throw new Error(result.error || 'Failed to fetch users');
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async () => {
    if (!newUser.email || !newUser.password || !newUser.first_name || !newUser.last_name) {
      setError('All fields are required');
      return;
    }

    if (newUser.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const result = await createUser({
        email: newUser.email,
        password: newUser.password,
        first_name: newUser.first_name,
        last_name: newUser.last_name,
        role: newUser.role,
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to create user');
      }

      setSuccess(`User ${newUser.email} created successfully! They should check their email for verification.`);
      setCreateOpen(false);
      setNewUser({
        email: '',
        password: '',
        first_name: '',
        last_name: '',
        role: 'staff',
      });
      fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create user');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (userId: string) => {
    try {
      const result = await archiveUser(userId);
      if (!result.success) {
        throw new Error(result.error || 'Failed to toggle user status');
      }
      fetchUsers();
    } catch (err) {
      console.error('Error toggling user status:', err);
    }
  };

  const handleArchiveUser = async (userId: string) => {
    try {
      const result = await archiveUser(userId);
      if (!result.success) {
        throw new Error(result.error || 'Failed to archive user');
      }
      fetchUsers();
    } catch (err) {
      console.error('Error archiving user:', err);
    }
  };

  const handleUpdateRole = async (userId: string, newRole: UserRole) => {
    // Note: This would need a server action as well for full security
    // For now, we'll skip this since it's not critical
    console.log('Update role functionality needs server action', userId, newRole);
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    // Verify confirmation text
    const expectedText = `DELETE ${userToDelete.first_name.toUpperCase()} ${userToDelete.last_name.toUpperCase()}`;
    if (deleteConfirmText !== expectedText) {
      setError('Confirmation text does not match');
      return;
    }

    setDeleting(true);
    setError(null);

    try {
      const result = await deleteUserAndData(userToDelete.id);

      if (!result.success) {
        throw new Error(result.error || 'Failed to delete user');
      }

      setSuccess(result.message || 'User deleted successfully');
      setDeleteDialogOpen(false);
      setUserToDelete(null);
      setDeleteConfirmText('');
      
      // Refresh users list
      setTimeout(() => {
        fetchUsers();
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete user');
    } finally {
      setDeleting(false);
    }
  };

  const stats = {
    total: users.length,
    active: users.filter(u => u.is_active).length,
    admins: users.filter(u => u.role === 'admin').length,
    caseManagers: users.filter(u => u.role === 'case_manager').length,
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!profile || profile.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <Shield className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Access Denied</h2>
            <p className="text-gray-600">You must be an administrator to access this page.</p>
            <Button className="mt-4" onClick={() => router.push('/dashboard')}>
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader title="Admin Panel" showBackButton />

      <main className="container px-4 py-6">
        {success && (
          <Alert className="mb-6 bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-sm text-gray-500">Total Users</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.active}</p>
                  <p className="text-sm text-gray-500">Active</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-100">
                  <Shield className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.admins}</p>
                  <p className="text-sm text-gray-500">Admins</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.caseManagers}</p>
                  <p className="text-sm text-gray-500">Case Managers</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Role Descriptions */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Info className="h-5 w-5" />
              User Roles & Permissions
            </CardTitle>
            <CardDescription>
              Understanding what each role can do in the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(roleDescriptions).map(([role, info]) => (
                <div key={role} className="p-4 border rounded-lg">
                  <Badge className={`${info.color} mb-2`}>{info.title}</Badge>
                  <p className="text-sm text-gray-600">{info.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* User Management */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">User Management</CardTitle>
              <CardDescription>Create and manage user accounts</CardDescription>
            </div>
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Create User
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Create New User</DialogTitle>
                  <DialogDescription>
                    Add a new staff member, volunteer, or case manager to the system.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  {error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>First Name *</Label>
                      <Input
                        value={newUser.first_name}
                        onChange={(e) => setNewUser(prev => ({ ...prev, first_name: e.target.value }))}
                        placeholder="John"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Last Name *</Label>
                      <Input
                        value={newUser.last_name}
                        onChange={(e) => setNewUser(prev => ({ ...prev, last_name: e.target.value }))}
                        placeholder="Doe"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Email *</Label>
                    <Input
                      type="email"
                      value={newUser.email}
                      onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="john.doe@example.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Temporary Password *</Label>
                    <Input
                      type="password"
                      value={newUser.password}
                      onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))}
                      placeholder="Min. 6 characters"
                    />
                    <p className="text-xs text-gray-500">
                      User will need to verify their email before logging in.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Role *</Label>
                    <Select
                      value={newUser.role}
                      onValueChange={(value) => setNewUser(prev => ({ ...prev, role: value as UserRole }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="volunteer">Volunteer</SelectItem>
                        <SelectItem value="staff">Staff</SelectItem>
                        <SelectItem value="case_manager">Case Manager</SelectItem>
                        <SelectItem value="admin">Administrator</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500">
                      {roleDescriptions[newUser.role]?.description}
                    </p>
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={() => setCreateOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateUser} disabled={saving}>
                      {saving ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        'Create User'
                      )}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-16" />
                ))}
              </div>
            ) : users.length > 0 ? (
              <div className="space-y-3">
                {users.map(user => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                        <span className="text-sm font-medium text-gray-600">
                          {user.first_name[0]}{user.last_name[0]}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">
                            {user.first_name} {user.last_name}
                          </p>
                          {user.id === profile?.id && (
                            <Badge variant="outline" className="text-xs">You</Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">{user.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Select
                        value={user.role}
                        onValueChange={(value) => handleUpdateRole(user.id, value as UserRole)}
                        disabled={user.id === profile?.id}
                      >
                        <SelectTrigger className="w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="volunteer">Volunteer</SelectItem>
                          <SelectItem value="staff">Staff</SelectItem>
                          <SelectItem value="case_manager">Case Manager</SelectItem>
                          <SelectItem value="admin">Administrator</SelectItem>
                        </SelectContent>
                      </Select>

                      <Badge className={user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </Badge>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" disabled={user.id === profile?.id}>
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleToggleActive(user.id)}>
                            {user.is_active ? (
                              <>
                                <XCircle className="h-4 w-4 mr-2" />
                                Deactivate
                              </>
                            ) : (
                              <>
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Activate
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Key className="h-4 w-4 mr-2" />
                            Reset Password
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleArchiveUser(user.id)}
                            className="text-orange-600"
                          >
                            <Archive className="h-4 w-4 mr-2" />
                            Archive User
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setUserToDelete(user);
                              setDeleteConfirmText('');
                              setDeleteDialogOpen(true);
                            }}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete User
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No users found</p>
                <p className="text-sm text-gray-400 mt-1">
                  Create your first user to get started.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Delete User Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-red-600 flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Permanently Delete User
              </DialogTitle>
              <DialogDescription>
                This action cannot be undone. All data associated with this user will be permanently deleted.
              </DialogDescription>
            </DialogHeader>

            {userToDelete && (
              <div className="space-y-4 py-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                  <p className="font-medium text-sm mb-2">User to delete:</p>
                  <p className="font-semibold">{userToDelete.first_name} {userToDelete.last_name}</p>
                  <p className="text-sm text-gray-600">{userToDelete.email}</p>
                  <Badge className="mt-2">{userToDelete.role}</Badge>
                </div>

                <div className="space-y-3 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <p className="font-medium text-sm">What will be deleted:</p>
                  <ul className="text-sm space-y-1 text-gray-700">
                    <li>• User account and login credentials</li>
                    <li>• Profile information</li>
                    {userToDelete.role === 'client' && (
                      <>
                        <li>• Client record and all intake data</li>
                        <li>• All uploaded documents and signatures</li>
                        <li>• Task assignments and calendar events</li>
                        <li>• Case management notes and history</li>
                      </>
                    )}
                    {userToDelete.role !== 'client' && (
                      <>
                        <li>• Assigned tasks and records</li>
                        <li>• Audit trail entries</li>
                      </>
                    )}
                  </ul>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    To confirm deletion, type: <span className="font-mono text-red-600 font-bold">DELETE {userToDelete.first_name.toUpperCase()} {userToDelete.last_name.toUpperCase()}</span>
                  </Label>
                  <Input
                    placeholder="Type confirmation text above"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    disabled={deleting}
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setDeleteDialogOpen(false);
                      setUserToDelete(null);
                      setDeleteConfirmText('');
                      setError(null);
                    }}
                    disabled={deleting}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleDeleteUser}
                    disabled={
                      deleting ||
                      deleteConfirmText !== `DELETE ${userToDelete.first_name.toUpperCase()} ${userToDelete.last_name.toUpperCase()}`
                    }
                  >
                    {deleting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Permanently Delete
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
