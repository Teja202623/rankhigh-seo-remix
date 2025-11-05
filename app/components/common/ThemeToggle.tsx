import { Button, Icon, Popover, ActionList } from '@shopify/polaris';
import { SunIcon, MoonIcon } from '@shopify/polaris-icons';
import { useState } from 'react';
import { useTheme } from '~/contexts/ThemeContext';

export default function ThemeToggle() {
  const { theme, effectiveTheme, setTheme } = useTheme();
  const [popoverActive, setPopoverActive] = useState(false);

  const togglePopover = () => setPopoverActive((active) => !active);

  const activator = (
    <Button
      onClick={togglePopover}
      disclosure={popoverActive ? 'up' : 'down'}
      icon={effectiveTheme === 'dark' ? MoonIcon : SunIcon}
    >
      Theme
    </Button>
  );

  return (
    <Popover
      active={popoverActive}
      activator={activator}
      onClose={togglePopover}
      preferredAlignment="right"
    >
      <ActionList
        items={[
          {
            content: 'Light',
            prefix: <Icon source={SunIcon} />,
            onAction: () => {
              setTheme('light');
              setPopoverActive(false);
            },
            active: theme === 'light',
          },
          {
            content: 'Dark',
            prefix: <Icon source={MoonIcon} />,
            onAction: () => {
              setTheme('dark');
              setPopoverActive(false);
            },
            active: theme === 'dark',
          },
          {
            content: 'Auto (System)',
            onAction: () => {
              setTheme('auto');
              setPopoverActive(false);
            },
            active: theme === 'auto',
          },
        ]}
      />
    </Popover>
  );
}
