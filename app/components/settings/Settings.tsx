import { useState, useCallback } from 'react';
import { Page, Layout, Card, Tabs } from '@shopify/polaris';
import { useNavigate } from '@remix-run/react';
import ExportImport from './ExportImport';
import RoleManager from './RoleManager';
import SEOAuditChecklist from '~/components/audit/SEOAuditChecklist';
import WidgetSystem from '~/components/dashboard/WidgetSystem';

export default function Settings() {
  const navigate = useNavigate();
  const [selectedTab, setSelectedTab] = useState(0);

  const handleTabChange = useCallback((selectedTabIndex: number) => setSelectedTab(selectedTabIndex), []);

  const handleExport = async (config: any) => {
    // TODO: Implement data export
    console.log('Exporting data with config:', config);
  };

  const handleImport = async (file: File) => {
    // TODO: Implement data import
    console.log('Importing data from:', file.name);
    return {
      success: true,
      itemsProcessed: 100,
      itemsFailed: 0,
      errors: [],
      warnings: [],
    };
  };

  const handleSaveRole = async (role: any) => {
    // TODO: Implement API call
    console.log('Saving role:', role);
  };

  const handleDeleteRole = async (id: string) => {
    // TODO: Implement API call
    console.log('Deleting role:', id);
  };

  const handleAssignRole = async (userId: string, roleId: string) => {
    // TODO: Implement API call
    console.log('Assigning role:', roleId, 'to user:', userId);
  };

  const handleSaveTask = async (task: any) => {
    // TODO: Implement API call
    console.log('Saving task:', task);
  };

  const handleCompleteTask = async (taskId: string) => {
    // TODO: Implement API call
    console.log('Completing task:', taskId);
  };

  const handleLoadTemplate = async (templateName: string) => {
    // TODO: Implement loading audit template
    console.log('Loading template:', templateName);
  };

  const handleUpdateWidgets = async (widgets: any[]) => {
    // TODO: Implement API call to save widget configuration
    console.log('Updating widgets:', widgets);
  };

  const handleAddWidget = async (type: string) => {
    // TODO: Implement API call
    console.log('Adding widget type:', type);
  };

  const tabs = [
    {
      id: 'export-import',
      content: 'Export & Import',
      panelID: 'export-import-panel',
    },
    {
      id: 'users-roles',
      content: 'Users & Roles',
      panelID: 'users-roles-panel',
    },
    {
      id: 'audit-checklist',
      content: 'Audit Checklist',
      panelID: 'audit-checklist-panel',
    },
    {
      id: 'dashboard-layout',
      content: 'Dashboard Layout',
      panelID: 'dashboard-layout-panel',
    },
  ];

  return (
    <Page title="Settings" backAction={{ onAction: () => navigate('/') }}>
      <Layout>
        <Layout.Section>
          <Card>
            <Tabs tabs={tabs} selected={selectedTab} onSelect={handleTabChange}>
              <div style={{ padding: '16px' }}>
                {selectedTab === 0 && (
                  <ExportImport onExport={handleExport} onImport={handleImport} />
                )}
                {selectedTab === 1 && (
                  <RoleManager
                    onCreateRole={handleSaveRole}
                    onDeleteRole={handleDeleteRole}
                    onAssignRole={handleAssignRole}
                  />
                )}
                {selectedTab === 2 && (
                  <SEOAuditChecklist
                    items={[]}
                    onAddItem={handleSaveTask}
                    onToggleItem={handleCompleteTask}
                    onLoadTemplate={handleLoadTemplate}
                  />
                )}
                {selectedTab === 3 && (
                  <WidgetSystem
                    onUpdateWidgets={handleUpdateWidgets}
                    onAddWidget={handleAddWidget}
                  />
                )}
              </div>
            </Tabs>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
