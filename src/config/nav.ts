
import type { LucideProps } from 'lucide-react'; // Keep for potential future use if detailed props are needed
import * as Icons from 'lucide-react'; // Import all icons to allow dynamic lookup by name

export interface NavItem {
  title: string;
  href: string;
  iconName: keyof typeof Icons; // Store icon name as a string
  disabled?: boolean;
  label?: string;
  items?: NavItem[]; // For sub-menus if needed
}

export const navItems: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    iconName: 'LayoutDashboard',
  },
  {
    title: 'Testing Suite',
    href: '/testing',
    iconName: 'Rocket',
    items: [
      {
        title: 'API Testing',
        href: '/api-testing',
        iconName: 'Network',
      },
      {
        title: 'UI Responsive Testing',
        href: '/responsive-testing',
        iconName: 'Smartphone',
      },
      {
        title: 'Security Testing',
        href: '/security-testing',
        iconName: 'ShieldCheck',
      },
      {
        title: 'OWASP Testing',
        href: '/owasp-testing',
        iconName: 'ShieldAlert',
      },
      {
        title: 'Performance Testing',
        href: '/performance-testing',
        iconName: 'Activity',
      },
      {
        title: 'Cross Browser Testing',
        href: '/cross-browser-testing',
        iconName: 'Globe',
      },
      {
        title: 'Accessibility Testing',
        href: '/accessibility-testing',
        iconName: 'Accessibility',
      },
       {
        title: 'Multiplayer Video',
        href: '/video-players',
        iconName: 'Video',
      },
      {
        title: 'Code Editor',
        href: '/code-editor',
        iconName: 'FileCode',
      },
    ],
  },
  {
    title: 'Automation',
    href: '/automation',
    iconName: 'Bot',
  },
  {
    title: 'Analysis & Reports',
    href: '/analysis',
    iconName: 'BarChart3',
    items: [
      {
        title: 'Audio Analyzer',
        href: '/audio-analyzer',
        iconName: 'AudioWaveform',
      },
      {
        title: 'Video Tools',
        href: '/video-tools',
        iconName: 'Film', // Added Video Tools
      },
      {
        title: 'Analytics',
        href: '/analytics',
        iconName: 'BarChart3',
      },
      {
        title: 'SEO Testing',
        href: '/seo-testing',
        iconName: 'Search',
      },
      {
        title: 'Gantt Report Generator',
        href: '/gantt-report-generator',
        iconName: 'FileText',
      },
    ],
  },
  {
    title: 'Management',
    href: '/management',
    iconName: 'ClipboardList',
    items: [
      {
        title: 'Test Cases',
        href: '/test-cases',
        iconName: 'ClipboardList',
      },
      {
        title: 'Defect Cases',
        href: '/defect-cases',
        iconName: 'Bug',
      },
      {
        title: 'Test Case Generator',
        href: '/test-case-generator',
        iconName: 'ClipboardPlus',
      },
      {
        title: 'Sprint Timeline',
        href: '/sprint-timeline',
        iconName: 'CalendarRange',
      },
    ],
  },
   {
    title: 'Design & Collab',
    href: '/integrations',
    iconName: 'Palette',
    items: [
      {
        title: 'Whiteboard & Figma',
        href: '/figma-integration',
        iconName: 'Palette',
      },
    ],
  },
  {
    title: 'Suggestions',
    href: '/suggestions',
    iconName: 'Lightbulb',
  },
  {
    title: 'History',
    href: '/history',
    iconName: 'HistoryIcon',
  },
  {
    title: 'Settings',
    href: '/settings',
    iconName: 'Settings',
  },
];
