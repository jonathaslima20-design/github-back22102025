import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProfileSettings } from '@/components/dashboard/ProfileSettings';
import { StorefrontSettings } from '@/components/dashboard/StorefrontSettings';
import TrackingSettingsContent from '@/components/dashboard/TrackingSettingsContent';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile');

  return (
    <div className="container mx-auto p-6 max-w-5xl space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground">
          Gerencie suas informações pessoais e configurações da vitrine
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 h-auto p-1 bg-muted/50">
          <TabsTrigger
            value="profile"
            className="data-[state=active]:bg-background data-[state=active]:shadow-sm py-3"
          >
            Perfil
          </TabsTrigger>
          <TabsTrigger
            value="storefront"
            className="data-[state=active]:bg-background data-[state=active]:shadow-sm py-3"
          >
            Vitrine
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-6">
          <ProfileSettings />
        </TabsContent>

        <TabsContent value="storefront" className="mt-6">
          <StorefrontSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}
