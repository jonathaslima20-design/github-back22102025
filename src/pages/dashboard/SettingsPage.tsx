import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProfileSettings } from '@/components/dashboard/ProfileSettings';
import { StorefrontSettings } from '@/components/dashboard/StorefrontSettings';
import TrackingSettingsContent from '@/components/dashboard/TrackingSettingsContent';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile');

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Configurações</h1>
        <p className="text-muted-foreground">Gerencie suas preferências e configurações da loja</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="profile">Perfil</TabsTrigger>
          <TabsTrigger value="storefront">Vitrine</TabsTrigger>
          <TabsTrigger value="tracking">Rastreamento</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-4">
          <ProfileSettings />
        </TabsContent>

        <TabsContent value="storefront" className="space-y-4">
          <StorefrontSettings />
        </TabsContent>

        <TabsContent value="tracking" className="space-y-4">
          <TrackingSettingsContent />
        </TabsContent>
      </Tabs>
    </div>
  );
}
