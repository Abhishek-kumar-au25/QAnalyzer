
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
        title: 'Manual Test Case',
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
      {
        title: 'Discovery & Planning Stage',
        href: '/management/discovery-planning',
        iconName: 'SearchCheck', // Example icon
        items: [
            { title: 'Product Vision', href: '/management/product-vision', iconName: 'Eye' },
            { title: 'Problem Statement', href: '/management/problem-statement', iconName: 'AlertOctagon' },
            { title: 'User Research', href: '/management/user-research', iconName: 'Users' },
            { title: 'Competitive Analysis', href: '/management/competitive-analysis', iconName: 'Telescope' },
            { title: 'Value Proposition', href: '/management/value-proposition', iconName: 'Gem' },
        ],
      },
      {
        title: 'Strategy & Roadmapping',
        href: '/management/strategy-roadmapping',
        iconName: 'Route', // Example icon
        items: [
            { title: 'Product Strategy', href: '/management/product-strategy', iconName: 'Target' },
            { title: 'Product Roadmap', href: '/management/product-roadmap', iconName: 'Map' },
            { title: 'OKRs / KPIs', href: '/management/okrs-kpis', iconName: 'Goal' },
        ],
      },
      {
        title: 'Requirements & Design',
        href: '/management/requirements-design',
        iconName: 'DraftingCompass', // Example icon
        items: [
            { title: 'PRD', href: '/management/prd', iconName: 'FileText' },
            { title: 'Wireframes & Prototypes', href: '/management/wireframes', iconName: 'MousePointer2' },
            { title: 'User Journey Maps', href: '/management/user-journey', iconName: 'Workflow' },
            { title: 'Feature Prioritization', href: '/management/feature-prioritization', iconName: 'ListFilter' },
        ],
      },
      {
        title: 'Execution & Delivery',
        href: '/management/execution-delivery',
        iconName: 'Send', // Example icon
        items: [
            { title: 'Sprint Planning Docs', href: '/management/sprint-planning-docs', iconName: 'CalendarDays' },
            { title: 'Release Notes', href: '/management/release-notes', iconName: 'Megaphone' },
            { title: 'QA Overview', href: '/management/qa-overview', iconName: 'ShieldCheck' },
            { title: 'Risk Management', href: '/management/risk-management', iconName: 'ShieldAlert' },
        ],
      },
      {
        title: 'Post-Launch & Evaluation',
        href: '/management/post-launch-evaluation',
        iconName: 'Recycle', // Example icon
        items: [
            { title: 'Analytics Dashboards', href: '/management/analytics-reports', iconName: 'LineChart' },
            { title: 'User Feedback Logs', href: '/management/user-feedback', iconName: 'MessageSquare' },
            { title: 'Retrospectives', href: '/management/retrospectives', iconName: 'RotateCcw' },
            { title: 'Feature Adoption Report', href: '/management/feature-adoption', iconName: 'TrendingUp' },
        ],
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
    iconName: 'History', // Changed from HistoryIcon
  },
  {
    title: 'Settings',
    href: '/settings',
    iconName: 'Settings',
  },
];
