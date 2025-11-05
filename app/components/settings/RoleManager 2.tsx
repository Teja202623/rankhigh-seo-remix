import {
  Card,
  Text,
  BlockStack,
  InlineStack,
  Button,
  Badge,
  DataTable,
  Checkbox,
  TextField,
  Icon,
  Select,
} from '@shopify/polaris';
import {
  PersonIcon,
  PlusIcon,
  DeleteIcon,
  EditIcon,
} from '@shopify/polaris-icons';
import { useState } from 'react';

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  userCount: number;
  isDefault: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  lastActive: string;
}

export interface Permission {
  id: string;
  name: string;
  category: string;
  description: string;
}

interface RoleManagerProps {
  roles?: Role[];
  users?: User[];
  permissions?: Permission[];
  onCreateRole?: (role: Omit<Role, 'id'>) => void;
  onUpdateRole?: (id: string, role: Partial<Role>) => void;
  onDeleteRole?: (id: string) => void;
  onAssignRole?: (userId: string, roleId: string) => void;
}

const DEFAULT_PERMISSIONS: Permission[] = [
  { id: 'view_dashboard', name: 'View Dashboard', category: 'General', description: 'Access to main dashboard' },
  { id: 'view_pages', name: 'View Pages', category: 'Pages', description: 'View page list and details' },
  { id: 'edit_pages', name: 'Edit Pages', category: 'Pages', description: 'Edit page SEO settings' },
  { id: 'delete_pages', name: 'Delete Pages', category: 'Pages', description: 'Delete pages' },
  { id: 'view_keywords', name: 'View Keywords', category: 'Keywords', description: 'View keyword tracking' },
  { id: 'manage_keywords', name: 'Manage Keywords', category: 'Keywords', description: 'Add/remove tracked keywords' },
  { id: 'view_analytics', name: 'View Analytics', category: 'Analytics', description: 'View GSC and performance data' },
  { id: 'view_reports', name: 'View Reports', category: 'Reports', description: 'View SEO reports' },
  { id: 'generate_reports', name: 'Generate Reports', category: 'Reports', description: 'Create and schedule reports' },
  { id: 'manage_schema', name: 'Manage Schema', category: 'Technical', description: 'Add/edit schema markup' },
  { id: 'manage_redirects', name: 'Manage Redirects', category: 'Technical', description: 'Create and manage redirects' },
  { id: 'manage_settings', name: 'Manage Settings', category: 'Settings', description: 'Change app settings' },
  { id: 'manage_users', name: 'Manage Users', category: 'Settings', description: 'Add/remove users and assign roles' },
];

const DEFAULT_ROLES: Role[] = [
  {
    id: 'admin',
    name: 'Administrator',
    description: 'Full access to all features',
    permissions: DEFAULT_PERMISSIONS.map((p) => p.id),
    userCount: 2,
    isDefault: true,
  },
  {
    id: 'editor',
    name: 'Editor',
    description: 'Can edit pages and manage content',
    permissions: ['view_dashboard', 'view_pages', 'edit_pages', 'view_keywords', 'view_analytics', 'view_reports'],
    userCount: 5,
    isDefault: true,
  },
  {
    id: 'viewer',
    name: 'Viewer',
    description: 'Read-only access',
    permissions: ['view_dashboard', 'view_pages', 'view_keywords', 'view_analytics', 'view_reports'],
    userCount: 3,
    isDefault: true,
  },
];

export default function RoleManager({
  roles = DEFAULT_ROLES,
  users = [],
  permissions = DEFAULT_PERMISSIONS,
  onCreateRole,
  onUpdateRole,
  onDeleteRole,
  onAssignRole,
}: RoleManagerProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [editingRole, setEditingRole] = useState<string | null>(null);
  const [newRole, setNewRole] = useState({
    name: '',
    description: '',
    permissions: [] as string[],
  });

  const handleCreateRole = () => {
    if (newRole.name && onCreateRole) {
      onCreateRole({
        ...newRole,
        userCount: 0,
        isDefault: false,
      });
      setNewRole({ name: '', description: '', permissions: [] });
      setIsCreating(false);
    }
  };

  const handleTogglePermission = (permissionId: string) => {
    setNewRole((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(permissionId)
        ? prev.permissions.filter((p) => p !== permissionId)
        : [...prev.permissions, permissionId],
    }));
  };

  // Group permissions by category
  const permissionsByCategory = permissions.reduce((acc, perm) => {
    if (!acc[perm.category]) {
      acc[perm.category] = [];
    }
    acc[perm.category].push(perm);
    return acc;
  }, {} as Record<string, Permission[]>);

  // Roles table
  const roleRows = roles.map((role) => [
    <div>
      <Text as="p" variant="bodyMd" fontWeight="semibold">
        {role.name}
      </Text>
      <Text as="p" variant="bodySm" tone="subdued">
        {role.description}
      </Text>
    </div>,
    <Badge tone="info">{`${role.permissions.length} permissions`}</Badge>,
    role.userCount.toLocaleString(),
    role.isDefault ? <Badge tone="success">Default</Badge> : <Badge>Custom</Badge>,
    <InlineStack gap="100">
      <Button size="slim" icon={EditIcon} onClick={() => setEditingRole(role.id)} />
      {!role.isDefault && onDeleteRole && (
        <Button size="slim" tone="critical" icon={DeleteIcon} onClick={() => onDeleteRole(role.id)} />
      )}
    </InlineStack>,
  ]);

  return (
    <BlockStack gap="400">
      {/* Header */}
      <Card>
        <InlineStack align="space-between" blockAlign="center">
          <div>
            <Text as="h2" variant="headingMd">
              Roles & Permissions
            </Text>
            <Text as="p" variant="bodySm" tone="subdued">
              Manage user roles and access permissions
            </Text>
          </div>
          {!isCreating && onCreateRole && (
            <Button variant="primary" icon={PlusIcon} onClick={() => setIsCreating(true)}>
              Create Role
            </Button>
          )}
        </InlineStack>
      </Card>

      {/* Statistics */}
      <InlineStack gap="400" wrap>
        <div style={{ flex: 1 }}>
          <Card>
            <BlockStack gap="200">
              <InlineStack gap="200" blockAlign="center">
                <Icon source={PersonIcon} tone="info" />
                <Text as="p" variant="bodySm" tone="subdued">
                  Total Roles
                </Text>
              </InlineStack>
              <Text as="p" variant="heading2xl">
                {roles.length}
              </Text>
            </BlockStack>
          </Card>
        </div>
        <div style={{ flex: 1 }}>
          <Card>
            <BlockStack gap="200">
              <Text as="p" variant="bodySm" tone="subdued">
                Total Users
              </Text>
              <Text as="p" variant="heading2xl">
                {users.length}
              </Text>
            </BlockStack>
          </Card>
        </div>
        <div style={{ flex: 1 }}>
          <Card>
            <BlockStack gap="200">
              <Text as="p" variant="bodySm" tone="subdued">
                Custom Roles
              </Text>
              <Text as="p" variant="heading2xl">
                {roles.filter((r) => !r.isDefault).length}
              </Text>
            </BlockStack>
          </Card>
        </div>
      </InlineStack>

      {/* Create Role Form */}
      {isCreating && (
        <Card>
          <BlockStack gap="400">
            <Text as="h3" variant="headingMd">
              Create New Role
            </Text>

            <TextField
              label="Role Name"
              value={newRole.name}
              onChange={(value) => setNewRole({ ...newRole, name: value })}
              placeholder="Content Manager"
              autoComplete="off"
            />

            <TextField
              label="Description"
              value={newRole.description}
              onChange={(value) => setNewRole({ ...newRole, description: value })}
              placeholder="Can manage all content and SEO settings"
              autoComplete="off"
            />

            <div>
              <Text as="p" variant="bodyMd" fontWeight="semibold">
                Permissions
              </Text>
              {Object.entries(permissionsByCategory).map(([category, perms]) => (
                <div key={category} style={{ marginTop: '16px' }}>
                  <Text as="p" variant="bodySm" fontWeight="semibold" tone="subdued">
                    {category}
                  </Text>
                  <BlockStack gap="200">
                    {perms.map((perm) => (
                      <Checkbox
                        key={perm.id}
                        label={perm.name}
                        checked={newRole.permissions.includes(perm.id)}
                        onChange={() => handleTogglePermission(perm.id)}
                        helpText={perm.description}
                      />
                    ))}
                  </BlockStack>
                </div>
              ))}
            </div>

            <InlineStack align="end" gap="200">
              <Button onClick={() => setIsCreating(false)}>Cancel</Button>
              <Button variant="primary" onClick={handleCreateRole} disabled={!newRole.name}>
                Create Role
              </Button>
            </InlineStack>
          </BlockStack>
        </Card>
      )}

      {/* Roles Table */}
      <Card>
        <BlockStack gap="400">
          <Text as="h3" variant="headingMd">
            Existing Roles
          </Text>

          <DataTable
            columnContentTypes={['text', 'text', 'numeric', 'text', 'text']}
            headings={['Role', 'Permissions', 'Users', 'Type', 'Actions']}
            rows={roleRows}
          />
        </BlockStack>
      </Card>

      {/* Permission Reference */}
      <Card>
        <BlockStack gap="300">
          <Text as="h3" variant="headingSm">
            Permission Reference
          </Text>
          <div
            style={{
              padding: '16px',
              backgroundColor: '#f0f9ff',
              border: '1px solid #bae6fd',
              borderRadius: '8px',
            }}
          >
            {Object.entries(permissionsByCategory).map(([category, perms]) => (
              <div key={category} style={{ marginBottom: '16px' }}>
                <Text as="p" variant="bodySm" fontWeight="semibold">
                  {category}
                </Text>
                <ul style={{ marginLeft: '20px', marginTop: '4px' }}>
                  {perms.map((perm) => (
                    <li key={perm.id}>
                      <Text as="span" variant="bodySm">
                        <strong>{perm.name}:</strong> {perm.description}
                      </Text>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </BlockStack>
      </Card>

      {/* Best Practices */}
      <Card>
        <BlockStack gap="300">
          <Text as="h3" variant="headingSm">
            Role Management Best Practices
          </Text>
          <div
            style={{
              padding: '16px',
              backgroundColor: '#f0f9ff',
              border: '1px solid #bae6fd',
              borderRadius: '8px',
            }}
          >
            <ul style={{ marginLeft: '20px' }}>
              <li>
                <Text as="span" variant="bodySm">
                  <strong>Principle of Least Privilege</strong> - Only grant permissions users need
                </Text>
              </li>
              <li>
                <Text as="span" variant="bodySm">
                  <strong>Regular audits</strong> - Review roles and permissions quarterly
                </Text>
              </li>
              <li>
                <Text as="span" variant="bodySm">
                  <strong>Default roles</strong> - Use built-in roles when possible
                </Text>
              </li>
              <li>
                <Text as="span" variant="bodySm">
                  <strong>Document custom roles</strong> - Note why custom roles were created
                </Text>
              </li>
              <li>
                <Text as="span" variant="bodySm">
                  <strong>Limit admins</strong> - Keep admin count to minimum necessary
                </Text>
              </li>
            </ul>
          </div>
        </BlockStack>
      </Card>
    </BlockStack>
  );
}
