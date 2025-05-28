
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart3, Construction, Users, TrendingUp, Filter } from "lucide-react";

export default function AnalyticsPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-primary flex items-center"><Users className="mr-2 h-5 w-5 text-accent"/>User Engagement</CardTitle>
            <CardDescription>
              Track active users, session duration, and popular features.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center text-center py-10 min-h-[200px]">
            <Construction className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-muted-foreground font-semibold">User Engagement Analytics</p>
            <p className="text-sm text-muted-foreground">This section is under active development.</p>
            <p className="text-xs text-muted-foreground mt-1">Real data integration coming soon.</p>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-primary flex items-center"><TrendingUp className="mr-2 h-5 w-5 text-accent"/>Performance Metrics</CardTitle>
            <CardDescription>
              Monitor API response times, error rates, and resource utilization.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center text-center py-10 min-h-[200px]">
            <Construction className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-muted-foreground font-semibold">Performance Metrics Dashboard</p>
            <p className="text-sm text-muted-foreground">This section is under active development.</p>
            <p className="text-xs text-muted-foreground mt-1">Real data integration coming soon.</p>
          </CardContent>
        </Card>

        <Card className="shadow-lg lg:col-span-1 md:col-span-2">
          <CardHeader>
            <CardTitle className="text-primary flex items-center"><Filter className="mr-2 h-5 w-5 text-accent"/>Custom Reports</CardTitle>
            <CardDescription>
              Generate custom reports based on specific dimensions and metrics.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center text-center py-10 min-h-[200px]">
            <Construction className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-muted-foreground font-semibold">Custom Report Builder</p>
            <p className="text-sm text-muted-foreground">This section is under active development.</p>
            <p className="text-xs text-muted-foreground mt-1">Real data integration coming soon.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
