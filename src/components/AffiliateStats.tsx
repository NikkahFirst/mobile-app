
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  LineChart, 
  Line,
  Legend
} from "recharts";
import { supabase } from "@/lib/supabaseClient";
import { format } from "date-fns";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import { Calendar, Clock, LineChart as LineChartIcon, PieChart as PieChartIcon } from "lucide-react";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#D53F8C'];

interface AffiliateStatsProps {
  userId: string;
  affiliateId: string;
  totalEarned: number;
  totalReferrals: number;
}

export const AffiliateStats = ({ userId, affiliateId, totalEarned, totalReferrals }: AffiliateStatsProps) => {
  const [loading, setLoading] = useState(true);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [conversionData, setConversionData] = useState<any[]>([]);
  const [planData, setPlanData] = useState<any[]>([]);
  
  useEffect(() => {
    const fetchStatsData = async () => {
      setLoading(true);
      try {
        // Get all conversions for this affiliate
        const { data: conversions, error } = await supabase
          .from('affiliate_conversions')
          .select(`
            *,
            profiles:referred_user_id (
              first_name,
              last_name,
              created_at
            )
          `)
          .eq('affiliate_id', affiliateId)
          .order('conversion_date', { ascending: true });
          
        if (error) throw error;
        
        // Process monthly data (earnings by month)
        const monthlyStats = processMonthlyData(conversions || []);
        setMonthlyData(monthlyStats);
        
        // Process conversion rate data
        const { data: referrals } = await supabase
          .from('affiliate_referrals')
          .select('id, signup_date, subscription_date')
          .eq('affiliate_id', affiliateId);
          
        // Combine referral and conversion data for conversion metrics
        const conversionStats = processConversionData(referrals || [], conversions || []);
        setConversionData(conversionStats);
        
        // Process subscription plan data
        const planStats = processSubscriptionPlans(conversions || []);
        setPlanData(planStats);
      } catch (err) {
        console.error("Error fetching affiliate statistics:", err);
      } finally {
        setLoading(false);
      }
    };
    
    if (affiliateId) {
      fetchStatsData();
    }
  }, [affiliateId]);
  
  // Process monthly earnings data
  const processMonthlyData = (conversions: any[]) => {
    const monthlyMap = new Map();
    
    conversions.forEach(conversion => {
      const date = new Date(conversion.conversion_date);
      const monthYear = format(date, 'MMM yyyy');
      
      if (!monthlyMap.has(monthYear)) {
        monthlyMap.set(monthYear, {
          month: monthYear,
          earnings: 0,
          count: 0,
          date: date // Keep date for sorting
        });
      }
      
      const current = monthlyMap.get(monthYear);
      current.earnings += conversion.commission_amount;
      current.count += 1;
      monthlyMap.set(monthYear, current);
    });
    
    // Convert to array and sort chronologically
    return Array.from(monthlyMap.values())
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .map(item => ({
        month: item.month,
        earnings: item.earnings,
        count: item.count
      }));
  };
  
  // Process conversion rate data
  const processConversionData = (referrals: any[], conversions: any[]) => {
    if (!referrals.length) return [];
    
    const conversionCount = conversions.length;
    const referralCount = referrals.length;
    const conversionRate = referralCount > 0 ? (conversionCount / referralCount) * 100 : 0;
    
    return [
      { name: 'Converted', value: conversionCount },
      { name: 'Not Converted', value: referralCount - conversionCount }
    ];
  };
  
  // Process subscription plan data
  const processSubscriptionPlans = (conversions: any[]) => {
    const planMap = new Map();
    
    conversions.forEach(conversion => {
      const plan = conversion.subscription_plan || 'Unknown';
      
      if (!planMap.has(plan)) {
        planMap.set(plan, {
          name: plan,
          value: 0,
          revenue: 0
        });
      }
      
      const current = planMap.get(plan);
      current.value += 1;
      current.revenue += conversion.commission_amount;
      planMap.set(plan, current);
    });
    
    return Array.from(planMap.values());
  };
  
  // Format currency values
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 2
    }).format(amount / 100);
  };
  
  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-2 border border-gray-200 shadow-md rounded-md text-xs">
          <p className="font-medium">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}: {entry.name.includes('earnings') ? formatCurrency(entry.value) : entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-nikkah-pink"></div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Monthly Earnings Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <LineChartIcon className="h-5 w-5 text-nikkah-pink" />
              Monthly Earnings
            </CardTitle>
          </CardHeader>
          <CardContent>
            {monthlyData.length > 0 ? (
              <ChartContainer 
                className="h-64"
                config={{
                  earnings: { theme: { light: '#E11D48', dark: '#FB7185' } },
                  axis: { theme: { light: '#94A3B8', dark: '#64748B' } }
                }}
              >
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-axis)" />
                  <XAxis dataKey="month" stroke="var(--color-axis)" />
                  <YAxis 
                    stroke="var(--color-axis)"
                    tickFormatter={(value) => `£${value / 100}`} 
                  />
                  <Tooltip content={<ChartTooltipContent />} />
                  <Line 
                    type="monotone" 
                    dataKey="earnings" 
                    name="Earnings"
                    stroke="var(--color-earnings)" 
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ChartContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-500">
                No earnings data available yet
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Referrals by Plan */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <PieChartIcon className="h-5 w-5 text-nikkah-pink" />
              Referrals by Plan
            </CardTitle>
          </CardHeader>
          <CardContent>
            {planData.length > 0 ? (
              <ChartContainer 
                className="h-64"
                config={{
                  plan0: { theme: { light: '#0088FE', dark: '#0088FE' } },
                  plan1: { theme: { light: '#00C49F', dark: '#00C49F' } },
                  plan2: { theme: { light: '#FFBB28', dark: '#FFBB28' } },
                  plan3: { theme: { light: '#FF8042', dark: '#FF8042' } },
                  plan4: { theme: { light: '#D53F8C', dark: '#D53F8C' } }
                }}
              >
                <PieChart>
                  <Pie
                    data={planData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {planData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value, name) => [value, name]}
                    content={<ChartTooltipContent />}
                  />
                  <Legend />
                </PieChart>
              </ChartContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-500">
                No plan data available yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Monthly Referral Count */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-5 w-5 text-nikkah-pink" />
              Monthly Referral Count
            </CardTitle>
          </CardHeader>
          <CardContent>
            {monthlyData.length > 0 ? (
              <ChartContainer 
                className="h-64"
                config={{
                  count: { theme: { light: '#8884D8', dark: '#A78BFA' } },
                  axis: { theme: { light: '#94A3B8', dark: '#64748B' } }
                }}
              >
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-axis)" />
                  <XAxis dataKey="month" stroke="var(--color-axis)" />
                  <YAxis stroke="var(--color-axis)" />
                  <Tooltip content={<ChartTooltipContent />} />
                  <Bar 
                    dataKey="count" 
                    name="Referral Count"
                    fill="var(--color-count)" 
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-500">
                No referral data available yet
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Conversion Metrics */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-5 w-5 text-nikkah-pink" />
              Conversion Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <p className="text-sm text-gray-500 mb-1">Conversion Rate</p>
                <p className="text-2xl font-bold">
                  {conversionData.length > 1 
                    ? `${((conversionData[0].value / (conversionData[0].value + conversionData[1].value)) * 100).toFixed(1)}%` 
                    : '0%'}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <p className="text-sm text-gray-500 mb-1">Avg. Commission</p>
                <p className="text-2xl font-bold">
                  {totalReferrals > 0 
                    ? formatCurrency(totalEarned / totalReferrals) 
                    : '£0.00'}
                </p>
              </div>
            </div>
            
            {conversionData.length > 0 ? (
              <ChartContainer 
                className="h-40 mt-4"
                config={{
                  converted: { theme: { light: '#10B981', dark: '#10B981' } },
                  notConverted: { theme: { light: '#EF4444', dark: '#EF4444' } }
                }}
              >
                <PieChart>
                  <Pie
                    data={conversionData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={50}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    <Cell fill="#10B981" />
                    <Cell fill="#EF4444" />
                  </Pie>
                  <Tooltip 
                    formatter={(value, name) => [value, name]}
                    content={<ChartTooltipContent />}
                  />
                </PieChart>
              </ChartContainer>
            ) : (
              <div className="flex items-center justify-center h-40 mt-4 text-gray-500">
                No conversion data available yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
