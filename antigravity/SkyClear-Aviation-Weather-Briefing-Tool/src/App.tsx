import React, { useState } from 'react';
import Navbar from './components/Navbar';
import HomeView from './components/HomeView';
import BriefingView from './components/BriefingView';
import AboutView from './components/AboutView';
import SkeletonLoader from './components/SkeletonLoader';
import { fetchAviationBriefing } from './utils/api';
import { BriefingData } from './utils/aviationTypes';

export default function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'briefing' | 'about'>('home');
  const [briefingData, setBriefingData] = useState<BriefingData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search trigger for ICAO
  const handleSearch = async (icao: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchAviationBriefing(icao);
      setBriefingData(data);
      setActiveTab('briefing');
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred while loading weather data.');
      setActiveTab('home');
    } finally {
      setIsLoading(false);
    }
  };

  // Live Refresh trigger
  const handleRefresh = async () => {
    if (!briefingData?.metar.icao) return;
    setIsRefreshing(true);
    try {
      const data = await fetchAviationBriefing(briefingData.metar.icao);
      setBriefingData(data);
    } catch (err: any) {
      // Show warning in console, keep existing data intact
      console.error('Failed to refresh aviation briefing:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleBackToSearch = () => {
    setActiveTab('home');
    setError(null);
  };

  // Render current tab view
  const renderContent = () => {
    if (isLoading) {
      return <SkeletonLoader />;
    }

    switch (activeTab) {
      case 'home':
        return (
          <HomeView 
            onSearch={handleSearch} 
            isLoading={isLoading} 
            error={error} 
          />
        );
      case 'briefing':
        if (briefingData) {
          return (
            <BriefingView 
              briefingData={briefingData} 
              onRefresh={handleRefresh} 
              isRefreshing={isRefreshing}
              onBackToSearch={handleBackToSearch}
            />
          );
        }
        // Fallback to home if no data is present
        return (
          <HomeView 
            onSearch={handleSearch} 
            isLoading={isLoading} 
            error={error} 
          />
        );
      case 'about':
        return <AboutView />;
      default:
        return (
          <HomeView 
            onSearch={handleSearch} 
            isLoading={isLoading} 
            error={error} 
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0F1E] flex flex-col selection:bg-[#38BDF8]/30 selection:text-white" id="skybrief-app-root">
      {/* Persistent Navigation */}
      <Navbar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        hasBriefingData={!!briefingData} 
      />

      {/* Main View Area */}
      <main className="flex-grow flex flex-col">
        {renderContent()}
      </main>
    </div>
  );
}
