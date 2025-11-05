import { useState } from 'react';
import { Frame, Navigation, TopBar, ActionList } from '@shopify/polaris';
import {
  HomeIcon,
  ChartVerticalIcon,
  PageIcon,
  SearchIcon,
  SettingsIcon,
  ExportIcon,
  LinkIcon,
  ImageIcon,
  ProductIcon,
  LocationIcon,
  SocialPostIcon,
  NotificationIcon,
  PlayCircleIcon,
  FolderIcon,
} from '@shopify/polaris-icons';
import { useNavigate, useLocation } from '@remix-run/react';
import ThemeToggle from '~/components/common/ThemeToggle';
import { ExperienceModeToggle } from '~/components/common/ExperienceModeToggle';
import NotificationCenter from '~/components/notifications/NotificationCenter';

interface NavigationLayoutProps {
  children: React.ReactNode;
}

export default function NavigationLayout({ children }: NavigationLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [userMenuActive, setUserMenuActive] = useState(false);
  const [mobileNavigationActive, setMobileNavigationActive] = useState(false);

  const shopName = localStorage.getItem('shopOrigin') || 'Your Store';

  const toggleUserMenuActive = () => setUserMenuActive(!userMenuActive);
  const toggleMobileNavigationActive = () => setMobileNavigationActive(!mobileNavigationActive);

  const userMenuActions = [
    {
      items: [
        { content: 'Settings', onAction: () => navigate('/settings') },
        { content: 'Documentation', onAction: () => window.open('https://docs.rankhigh.app', '_blank') },
        { content: 'Support', onAction: () => window.open('https://support.rankhigh.app', '_blank') },
      ],
    },
    {
      items: [
        {
          content: 'Logout',
          onAction: () => {
            localStorage.removeItem('authToken');
            localStorage.removeItem('shopOrigin');
            window.location.href = '/';
          },
        },
      ],
    },
  ];

  const userMenuMarkup = (
    <TopBar.UserMenu
      actions={userMenuActions}
      name={shopName}
      initials={shopName.charAt(0).toUpperCase()}
      open={userMenuActive}
      onToggle={toggleUserMenuActive}
    />
  );

  const topBarMarkup = (
    <TopBar
      showNavigationToggle
      userMenu={userMenuMarkup}
      onNavigationToggle={toggleMobileNavigationActive}
      secondaryMenu={
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', paddingRight: '16px' }}>
          <ExperienceModeToggle />
          <ThemeToggle />
          <NotificationCenter notifications={[]} />
        </div>
      }
    />
  );

  const navigationMarkup = (
    <Navigation location={location.pathname}>
      <Navigation.Section
        items={[
          {
            url: '/',
            label: 'Dashboard',
            icon: HomeIcon,
            selected: location.pathname === '/',
            onClick: () => navigate('/'),
          },
          {
            url: '/wizard',
            label: 'Setup Wizard',
            icon: FolderIcon,
            selected: location.pathname === '/wizard',
            onClick: () => navigate('/wizard'),
          },
        ]}
      />
      <Navigation.Section
        title="SEO Management"
        items={[
          {
            url: '/pages',
            label: 'Pages',
            icon: PageIcon,
            selected: location.pathname.startsWith('/pages'),
            onClick: () => navigate('/pages'),
          },
          {
            url: '/keywords',
            label: 'Keywords',
            icon: SearchIcon,
            selected: location.pathname.startsWith('/keywords'),
            onClick: () => navigate('/keywords'),
          },
          {
            url: '/content',
            label: 'Content Analysis',
            icon: PageIcon,
            selected: location.pathname.startsWith('/content'),
            onClick: () => navigate('/content'),
          },
          {
            url: '/app/seo/schema',
            label: 'Schema Markup',
            icon: ProductIcon,
            selected: location.pathname.startsWith('/app/seo/schema'),
            onClick: () => navigate('/app/seo/schema'),
          },
          {
            url: '/images',
            label: 'Image SEO',
            icon: ImageIcon,
            selected: location.pathname.startsWith('/images'),
            onClick: () => navigate('/images'),
          },
          {
            url: '/products',
            label: 'Product SEO',
            icon: ProductIcon,
            selected: location.pathname.startsWith('/products'),
            onClick: () => navigate('/products'),
          },
          {
            url: '/videos',
            label: 'Video SEO',
            icon: PlayCircleIcon,
            selected: location.pathname.startsWith('/videos'),
            onClick: () => navigate('/videos'),
          },
        ]}
      />
      <Navigation.Section
        title="Technical SEO"
        items={[
          {
            url: '/audits',
            label: 'SEO Audit',
            icon: ExportIcon,
            selected: location.pathname.startsWith('/audits'),
            onClick: () => navigate('/audits'),
          },
          {
            url: '/redirects',
            label: 'Redirects & 404s',
            icon: LinkIcon,
            selected: location.pathname.startsWith('/redirects'),
            onClick: () => navigate('/redirects'),
          },
          {
            url: '/links',
            label: 'Link Management',
            icon: LinkIcon,
            selected: location.pathname.startsWith('/links'),
            onClick: () => navigate('/links'),
          },
          {
            url: '/sitemap',
            label: 'Sitemaps',
            icon: FolderIcon,
            selected: location.pathname.startsWith('/sitemap'),
            onClick: () => navigate('/sitemap'),
          },
          {
            url: '/breadcrumbs',
            label: 'Breadcrumbs',
            icon: FolderIcon,
            selected: location.pathname.startsWith('/breadcrumbs'),
            onClick: () => navigate('/breadcrumbs'),
          },
          {
            url: '/performance',
            label: 'Site Performance',
            icon: ChartVerticalIcon,
            selected: location.pathname.startsWith('/performance'),
            onClick: () => navigate('/performance'),
          },
        ]}
      />
      <Navigation.Section
        title="Analytics & Insights"
        items={[
          {
            url: '/analytics',
            label: 'Google Search Console',
            icon: ChartVerticalIcon,
            selected: location.pathname.startsWith('/analytics'),
            onClick: () => navigate('/analytics'),
          },
          {
            url: '/competitors',
            label: 'Competitor Analysis',
            icon: SearchIcon,
            selected: location.pathname.startsWith('/competitors'),
            onClick: () => navigate('/competitors'),
          },
          {
            url: '/reports',
            label: 'Reports',
            icon: ExportIcon,
            selected: location.pathname.startsWith('/reports'),
            onClick: () => navigate('/reports'),
          },
          {
            url: '/crawl-errors',
            label: 'Crawl Errors',
            icon: NotificationIcon,
            selected: location.pathname.startsWith('/crawl-errors'),
            onClick: () => navigate('/crawl-errors'),
          },
        ]}
      />
      <Navigation.Section
        title="Marketing"
        items={[
          {
            url: '/local-seo',
            label: 'Local SEO',
            icon: LocationIcon,
            selected: location.pathname.startsWith('/local-seo'),
            onClick: () => navigate('/local-seo'),
          },
          {
            url: '/social',
            label: 'Social Media',
            icon: SocialPostIcon,
            selected: location.pathname.startsWith('/social'),
            onClick: () => navigate('/social'),
          },
          {
            url: '/rss',
            label: 'RSS Feeds',
            icon: FolderIcon,
            selected: location.pathname.startsWith('/rss'),
            onClick: () => navigate('/rss'),
          },
          {
            url: '/knowledge-graph',
            label: 'Knowledge Graph',
            icon: SearchIcon,
            selected: location.pathname.startsWith('/knowledge-graph'),
            onClick: () => navigate('/knowledge-graph'),
          },
        ]}
      />
      <Navigation.Section
        items={[
          {
            url: '/settings',
            label: 'Settings',
            icon: SettingsIcon,
            selected: location.pathname.startsWith('/settings'),
            onClick: () => navigate('/settings'),
          },
        ]}
      />
    </Navigation>
  );

  return (
    <Frame
      topBar={topBarMarkup}
      navigation={navigationMarkup}
      showMobileNavigation={mobileNavigationActive}
      onNavigationDismiss={toggleMobileNavigationActive}
    >
      {children}
    </Frame>
  );
}
