// src/app/(app)/dashboard/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, AlertTriangle, Network, Users, Settings, ClipboardList, Bug, UserPlus, Mail, Phone, Server, CheckCircle, Activity } from "lucide-react"; // Added Activity
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
// Import chart components
import { PieChart, Pie, Cell, ResponsiveContainer, Bar, XAxis, YAxis, CartesianGrid, BarChart as RechartsBarChart } from 'recharts';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip as ShadcnChartTooltip,
  ChartTooltipContent as ShadcnChartTooltipContent,
  type ChartConfig
} from "@/components/ui/chart";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { db } from '@/lib/firebase/firebase.config'; // Import Firestore instance
import { collection, query, orderBy, limit, getDocs, Timestamp, getCountFromServer, where } from 'firebase/firestore';
import { GoogleIcon } from '@/components/icons/google-icon';
import { useAuth } from '@/contexts/AuthContext'; // Import useAuth
import { AlertDialog, AlertDialogContent as AlertDialogContentNested, AlertDialogDescription as AlertDialogDescriptionNested, AlertDialogFooter as AlertDialogFooterNested, AlertDialogHeader as AlertDialogHeaderNested, AlertDialogTitle as AlertDialogTitleNested } from "@/components/ui/dialog"; // Import AlertDialog components
import { useToast } from '@/hooks/use-toast'; // Import useToast


const userCountFilterOptions = [
  { label: 'Today', value: 'today' },
  { label: 'This Month', value: 'thisMonth' },
  { label: 'This Year', value: 'thisYear' },
  { label: 'Last Year', value: 'lastYear' },
];

interface UserRegistrationData {
  period: string;
  count: number;
}

interface RecentUser {
  id: string;
  name: string;
  avatarUrl?: string | null;
  email: string;
  joinDate: Date;
  signUpMethod?: 'Email' | 'Google' | 'Phone' | 'Unknown';
}


export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [testCasesCount, setTestCasesCount] = useState(0);
  const [isTestCasesLoading, setIsTestCasesLoading] = useState(true);
  const [defectCasesCount, setDefectCasesCount] = useState(0);
  const [isDefectCasesLoading, setIsDefectCasesLoading] = useState(true);
  const [apiCallLogsCount, setApiCallLogsCount] = useState(0);
  const [isApiCallLogsLoading, setIsApiCallLogsLoading] = useState(true);
  const [totalUsersCount, setTotalUsersCount] = useState(0);
  const [isTotalUsersLoading, setIsTotalUsersLoading] = useState(true);
  const { toast } = useToast();


  const [performanceData, setPerformanceData] = useState([
    { name: 'Defect Cases', value: 0, fill: "hsl(var(--destructive))" },
    { name: 'Test Cases', value: 0, fill: "hsl(var(--accent))" },
  ]);

  const [userRegistrationChartData, setUserRegistrationChartData] = useState<UserRegistrationData[]>([]);
  const [selectedUserFilter, setSelectedUserFilter] = useState<string>('thisMonth');
  const [isUserCountLoading, setIsUserCountLoading] = useState<boolean>(true);
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
  const [isRecentUsersLoading, setIsRecentUsersLoading] = useState<boolean>(true);
  const [apiStatus, setApiStatus] = useState<{ message: string, lastCheck: string, icon: React.ElementType }>({
    message: "Checking...",
    lastCheck: "N/A",
    icon: Loader2
  });
  const [criticalDefectsCount, setCriticalDefectsCount] = useState(0); // Renamed from criticalAlertsCount
  const [isCriticalDefectsLoading, setIsCriticalDefectsLoading] = useState(true); // Loading state for critical defects
  const [isClientSideRender, setIsClientSideRender] = useState(false);
  const [showAlertsModal, setShowAlertsModal] = useState(false); // State for alerts modal


  useEffect(() => {
    setIsClientSideRender(true);
    setTimeout(() => {
        const isApiUp = Math.random() > 0.1;
        setApiStatus({
            message: isApiUp ? "All Systems Go" : "Service Disruption",
            lastCheck: new Date().toLocaleTimeString(),
            icon: isApiUp ? CheckCircle : AlertTriangle
        });
        // Removed simulated critical alerts count, will be fetched from Firestore
    }, 1500);
  }, []);


  // Fetch dynamic counts for Test Cases, Defect Cases, API Call Logs, and Critical Defects
  useEffect(() => {
    if (user) {
      const fetchCounts = async () => {
        // Test Cases
        setIsTestCasesLoading(true);
        try {
          const tcColRef = collection(db, 'users', user.uid, 'test_cases');
          const tcSnapshot = await getCountFromServer(tcColRef);
          setTestCasesCount(tcSnapshot.data().count);
        } catch (error) {
          console.error("Error fetching test cases count:", error);
          setTestCasesCount(0);
        } finally {
          setIsTestCasesLoading(false);
        }

        // Defect Cases (Total)
        setIsDefectCasesLoading(true);
        try {
          const dcColRef = collection(db, 'users', user.uid, 'defect_cases');
          const dcSnapshot = await getCountFromServer(dcColRef);
          setDefectCasesCount(dcSnapshot.data().count);
        } catch (error) {
          console.error("Error fetching defect cases count:", error);
          setDefectCasesCount(0);
        } finally {
          setIsDefectCasesLoading(false);
        }
        
        // API Call Logs
        setIsApiCallLogsLoading(true);
        try {
          const logsColRef = collection(db, 'users', user.uid, 'api_calls_history');
          const logsSnapshot = await getCountFromServer(logsColRef);
          setApiCallLogsCount(logsSnapshot.data().count);
        } catch (error) {
          console.error("Error fetching API call logs count:", error);
          setApiCallLogsCount(0);
        } finally {
          setIsApiCallLogsLoading(false);
        }

        // Critical Defect Cases
        setIsCriticalDefectsLoading(true);
        try {
          const criticalDcQuery = query(
            collection(db, 'users', user.uid, 'defect_cases'),
            where('severity', '==', 'Critical')
          );
          const criticalDcSnapshot = await getCountFromServer(criticalDcQuery);
          setCriticalDefectsCount(criticalDcSnapshot.data().count);
        } catch (error) {
          console.error("Error fetching critical defect cases count:", error);
          setCriticalDefectsCount(0);
        } finally {
          setIsCriticalDefectsLoading(false);
        }
      };
      fetchCounts();
    } else if (!authLoading) {
        setTestCasesCount(0);
        setDefectCasesCount(0);
        setApiCallLogsCount(0);
        setCriticalDefectsCount(0);
        setIsTestCasesLoading(false);
        setIsDefectCasesLoading(false);
        setIsApiCallLogsLoading(false);
        setIsCriticalDefectsLoading(false);
    }
  }, [user, authLoading]);

  useEffect(() => {
    setPerformanceData([
        { name: 'Defect Cases', value: defectCasesCount, fill: "hsl(var(--destructive))" },
        { name: 'Test Cases', value: testCasesCount, fill: "hsl(var(--accent))" },
    ]);
  }, [testCasesCount, defectCasesCount]);


  useEffect(() => {
    if (authLoading) return; 

    const fetchRecentUsers = async () => {
      setIsRecentUsersLoading(true);
      try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, orderBy('createdAt', 'desc'), limit(12));
        const querySnapshot = await getDocs(q);
        const fetchedUsers: RecentUser[] = [];
        querySnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          fetchedUsers.push({
            id: docSnap.id,
            name: data.displayName || data.email?.split('@')[0] || 'Anonymous User',
            avatarUrl: data.photoURL,
            email: data.email,
            joinDate: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt),
            signUpMethod: data.signUpMethod || 'Unknown',
          });
        });
        setRecentUsers(fetchedUsers);
      } catch (error) {
        console.error("Error fetching recent users:", error);
      } finally {
        setIsRecentUsersLoading(false);
      }
    };

    fetchRecentUsers();
  }, [authLoading]);

  useEffect(() => {
    if (authLoading) return;
    const fetchTotalUserCount = async () => {
        setIsTotalUsersLoading(true);
        try {
            const usersRef = collection(db, 'users');
            const snapshot = await getCountFromServer(usersRef);
            setTotalUsersCount(snapshot.data().count);
        } catch (error) {
            console.error("Error fetching total user count:", error);
            setTotalUsersCount(0);
        } finally {
            setIsTotalUsersLoading(false);
        }
    };
    fetchTotalUserCount();
  }, [authLoading]);


  useEffect(() => {
    if (authLoading) return;
    setIsUserCountLoading(true);
    setUserRegistrationChartData([]);

    const filterUsersByPeriod = async () => {
        let count = 0;
        const now = new Date();
        let startDate: Date | null = null;
        let endDate: Date | null = null;

        switch (selectedUserFilter) {
            case 'today':
                startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
                endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
                break;
            case 'thisMonth':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
                break;
            case 'thisYear':
                startDate = new Date(now.getFullYear(), 0, 1);
                endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
                break;
            case 'lastYear':
                startDate = new Date(now.getFullYear() - 1, 0, 1);
                endDate = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
                break;
        }

        if (startDate && endDate) {
            try {
                const usersRef = collection(db, 'users');
                const q = query(usersRef,
                                orderBy('createdAt', 'desc'), // Keep orderBy for consistency if needed, or remove if only filtering by range
                                where('createdAt', '>=', Timestamp.fromDate(startDate)),
                                where('createdAt', '<=', Timestamp.fromDate(endDate))
                               );
                const snapshot = await getCountFromServer(q);
                count = snapshot.data().count;
            } catch (error) {
                console.error("Error fetching user registration count for period:", error);
                count = 0;
            }
        }

        setUserRegistrationChartData([{ period: getFilterLabel(selectedUserFilter, true), count: count }]);
        setIsUserCountLoading(false);
    };

    filterUsersByPeriod();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUserFilter, authLoading]);


  const getFilterLabel = (filterValue: string, capitalize: boolean = false) => {
    const option = userCountFilterOptions.find(opt => opt.value === filterValue);
    if (!option) return 'selected period';
    return capitalize ? option.label : option.label.toLowerCase();
  };


  const chartConfig: ChartConfig = {
    "Defect Cases": {
      label: "Defect Cases",
      color: "hsl(var(--destructive))",
    },
    "Test Cases": {
      label: "Test Cases",
      color: "hsl(var(--accent))",
    },
    value: {
      label: "Count",
      color: "hsl(var(--chart-1))",
    },
    count: {
      label: "New Users",
      color: "hsl(var(--chart-2))",
    }
  };


  return (
    <div className="container mx-auto py-8">
      {/* Metric Cards Row */}
      <div className="grid gap-6 mb-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Total Test Cases</CardTitle>
            <ClipboardList className="h-5 w-5 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{isTestCasesLoading ? <Loader2 className="h-6 w-6 animate-spin"/> : testCasesCount}</div>
            <p className="text-xs text-muted-foreground">Managed by you</p>
            <Button size="sm" className="mt-4 w-full" asChild>
              <Link href="/test-cases">View Test Cases</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Total Defect Cases</CardTitle>
            <Bug className="h-5 w-5 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{isDefectCasesLoading ? <Loader2 className="h-6 w-6 animate-spin"/> : defectCasesCount}</div>
            <p className="text-xs text-muted-foreground">Tracked by you</p>
            <Button size="sm" className="mt-4 w-full" asChild>
              <Link href="/defect-cases">View Defects</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">API Call Logs</CardTitle>
            <Activity className="h-5 w-5 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{isApiCallLogsLoading ? <Loader2 className="h-6 w-6 animate-spin"/> : apiCallLogsCount}</div>
            <p className="text-xs text-muted-foreground">Logged by you via API Tester</p>
             <Button size="sm" className="mt-4 w-full" asChild>
               <Link href="/api-testing">Go to API Tester</Link>
             </Button>
          </CardContent>
        </Card>

        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Registered Users</CardTitle>
            <Users className="h-5 w-5 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{isTotalUsersLoading ? <Loader2 className="h-6 w-6 animate-spin"/> : totalUsersCount}</div>
            <p className="text-xs text-muted-foreground">Total platform accounts</p>
             <Button size="sm" className="mt-4 w-full" asChild>
               <Link href="/settings">Manage Users</Link>
             </Button>
          </CardContent>
        </Card>
      </div>

      {/* Other Cards Row (API Status, Critical Alerts, Quick Settings) */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-6">
        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">API Status</CardTitle>
             {apiStatus.icon === Loader2 ? <Loader2 className="h-5 w-5 text-accent animate-spin"/> : <apiStatus.icon className={`h-5 w-5 ${apiStatus.message === "All Systems Go" ? "text-green-500" : "text-destructive"}`} />}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${apiStatus.message === "All Systems Go" ? "text-green-600" : "text-destructive"}`}>{apiStatus.message}</div>
            <p className="text-xs text-muted-foreground">Last check: {isClientSideRender ? apiStatus.lastCheck : '...'}</p>
             <Button size="sm" variant="outline" className="mt-4 w-full" asChild>
               <Link href="/api-testing">Check API Health</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Critical Defects</CardTitle>
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{isCriticalDefectsLoading ? <Loader2 className="h-6 w-6 animate-spin"/> : criticalDefectsCount}</div>
            <p className="text-xs text-muted-foreground">Needs immediate attention</p>
            <Button
              size="sm"
              variant="destructive"
              className="mt-4 w-full"
              disabled={isCriticalDefectsLoading || criticalDefectsCount === 0}
              onClick={() => {
                if (!isCriticalDefectsLoading && criticalDefectsCount > 0) {
                    setShowAlertsModal(true);
                } else if (!isCriticalDefectsLoading && criticalDefectsCount === 0) {
                    toast({ title: "No Critical Defects", description: "There are currently no critical defects to display." });
                }
              }}
            >
              View Critical Defects
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Quick Settings</CardTitle>
            <Settings className="h-5 w-5 text-accent" />
          </CardHeader>
          <CardContent className="flex flex-col space-y-2">
            <Button variant="ghost" className="justify-start" asChild>
              <Link href="/settings">Profile Settings</Link>
            </Button>
            <Button variant="ghost" className="justify-start" asChild>
              <Link href="/settings">System Configuration</Link>
            </Button>
            <Button variant="ghost" className="justify-start" asChild>
              <Link href="/settings">Notification Preferences</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Chart Row (Performance Overview & New User Registrations) */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2 mb-6">
         <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 md:col-span-1 lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-primary flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-accent" />
              Test & Defect Overview
            </CardTitle>
            <CardDescription>Comparison of your Defect Cases and Test Cases.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center justify-around md:h-[350px] py-6">
            <div className="flex-1 h-[300px] w-full">
                <ChartContainer config={chartConfig} className="w-full h-full min-h-[200px] max-w-xs mx-auto">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <ShadcnChartTooltip
                        cursor={false}
                        content={<ShadcnChartTooltipContent hideLabel />}
                      />
                      <Pie
                        data={performanceData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={70}
                        innerRadius={40}
                      >
                        {performanceData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <ChartLegend
                        content={<ChartLegendContent nameKey="name" />}
                        className="-translate-y-2 flex-wrap gap-2 [&>*]:basis-1/4 [&>*]:justify-center"
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartContainer>
            </div>
            <div className="flex-1 h-[300px] w-full">
                <ChartContainer config={chartConfig} className="w-full h-full min-h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <RechartsBarChart data={performanceData} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
                            <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                            <XAxis type="number" dataKey="value" allowDecimals={false} />
                            <YAxis dataKey="name" type="category" width={100} tickLine={false} axisLine={false} />
                            <ShadcnChartTooltip cursor={false} content={<ShadcnChartTooltipContent />} />
                            <ChartLegend content={<ChartLegendContent />} />
                            <Bar dataKey="value" radius={4} barSize={30}>
                                {performanceData.map((entry, index) => (
                                    <Cell key={`cell-bar-${index}`} fill={entry.fill} />
                                ))}
                            </Bar>
                        </RechartsBarChart>
                    </ResponsiveContainer>
                </ChartContainer>
            </div>
          </CardContent>
           <CardFooter>
                <p className="text-xs text-muted-foreground">
                   Data based on your test cases and defects in Firestore.
                </p>
           </CardFooter>
        </Card>

        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 md:col-span-1 lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-primary flex items-center">
                <UserPlus className="h-5 w-5 text-accent mr-2" />New User Registrations
            </CardTitle>
            <CardDescription>Total platform users joined in the {getFilterLabel(selectedUserFilter)}.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="user-filter-select" className="sr-only">Filter by period</Label>
              <Select value={selectedUserFilter} onValueChange={setSelectedUserFilter}>
                <SelectTrigger id="user-filter-select">
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  {userCountFilterOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="min-h-[150px] flex items-center justify-center">
              {isUserCountLoading ? (
                <Loader2 className="h-8 w-8 animate-spin text-accent" />
              ) : userRegistrationChartData.length > 0 ? (
                <ChartContainer config={chartConfig} className="w-full h-[150px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <RechartsBarChart data={userRegistrationChartData} layout="vertical" margin={{top: 5, right: 20, left: 10, bottom: 5}}>
                            <CartesianGrid horizontal={false} />
                            <XAxis type="number" dataKey="count" domain={[0, 'dataMax + 10']} allowDecimals={false}/>
                            <YAxis dataKey="period" type="category" width={80} tickLine={false} axisLine={false} />
                            <ShadcnChartTooltip cursor={false} content={<ShadcnChartTooltipContent />} />
                            <Bar dataKey="count" fill="var(--color-count)" radius={4} barSize={35}>
                                <Cell fill={chartConfig.count.color} />
                            </Bar>
                        </RechartsBarChart>
                    </ResponsiveContainer>
                </ChartContainer>
              ) : (
                <p className="text-muted-foreground">No data to display for the selected period.</p>
              )}
            </div>
          </CardContent>
           <CardFooter>
                <p className="text-xs text-muted-foreground">
                    User registration counts are based on data from Firestore.
                </p>
           </CardFooter>
        </Card>
      </div>

      <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 lg:col-span-3">
        <CardHeader>
          <CardTitle className="text-primary flex items-center">
            <Users className="mr-2 h-5 w-5 text-accent" /> Recently Joined Users
          </CardTitle>
          <CardDescription>
            Latest members who have joined the QAnalyzer platform.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isRecentUsersLoading ? (
            <div className="flex items-center justify-center h-[300px]">
                <Loader2 className="h-10 w-10 animate-spin text-accent"/>
            </div>
          ) : recentUsers.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No recent users to display.</p>
          ) : (
            <ScrollArea className="h-[300px]">
              <div className="space-y-4">
                {recentUsers.map((userEntry) => (
                  <div key={userEntry.id} className="flex items-center space-x-4 p-3 border rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors">
                    <Avatar className="h-10 w-10 border">
                       <AvatarImage src={userEntry.avatarUrl || undefined} alt={userEntry.name || 'User Avatar'} data-ai-hint="person avatar" />
                       <AvatarFallback>{(userEntry.name || 'U').split(' ').map(n => n[0]).join('').toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-grow">
                      <p className="text-sm font-medium text-foreground">{userEntry.name}</p>
                      <p className="text-xs text-muted-foreground">{userEntry.email}</p>
                    </div>
                    <div className="text-right">
                       {userEntry.signUpMethod === 'Email' ?
                            <Mail className="h-4 w-4 text-blue-500" /> :
                        userEntry.signUpMethod === 'Google' ?
                            <GoogleIcon className="h-4 w-4" /> :
                        userEntry.signUpMethod === 'Phone' ?
                            <Phone className="h-4 w-4 text-green-500" /> :
                            <Server className="h-4 w-4 text-muted-foreground" />
                       }
                      <p className="text-xs text-muted-foreground mt-1">
                        Joined: {isClientSideRender ? new Date(userEntry.joinDate).toLocaleDateString() : 'Loading date...'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
        <CardFooter>
            <p className="text-xs text-muted-foreground">
                Displaying the last {recentUsers.length} joined users from Firebase.
            </p>
        </CardFooter>
      </Card>

      {/* Alerts Modal */}
        <AlertDialog open={showAlertsModal} onOpenChange={setShowAlertsModal}>
            <AlertDialogContentNested>
                <AlertDialogHeaderNested>
                    <AlertDialogTitleNested>Critical System Defects</AlertDialogTitleNested>
                    <AlertDialogDescriptionNested>
                        {isCriticalDefectsLoading ? "Loading critical defect count..." :
                         criticalDefectsCount > 0 ?
                            `There are ${criticalDefectsCount} critical defect(s) requiring attention. (Details would be listed here - Feature Under Development)` :
                            "No critical defects at the moment."
                        }
                    </AlertDialogDescriptionNested>
                </AlertDialogHeaderNested>
                <AlertDialogFooterNested>
                    <Button variant="outline" onClick={() => setShowAlertsModal(false)}>Close</Button>
                    {/* Future: <AlertDialogAction>View Defects</AlertDialogAction> */}
                </AlertDialogFooterNested>
            </AlertDialogContentNested>
        </AlertDialog>
    </div>
  );
}
