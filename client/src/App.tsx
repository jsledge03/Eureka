import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import NotFound from "@/pages/not-found";
import Layout from "@/components/Layout";

import Dashboard from "@/pages/Dashboard";
import Home from "@/pages/Home";
import Identity from "@/pages/Identity";
import Review from "@/pages/Review";
import HabitsHub from "@/pages/HabitsHub";
import Tasks from "@/pages/Tasks";
import CoachTab from "@/pages/CoachTab";

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/today" component={Home} />
        <Route path="/tasks" component={Tasks} />
        <Route path="/habits" component={HabitsHub} />
        <Route path="/identity" component={Identity} />
        <Route path="/review" component={Review} />
        <Route path="/coach" component={CoachTab} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeProvider>
          <Toaster />
          <Router />
        </ThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;