import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { ProfileSettings } from '@/components/dashboard/ProfileSettings';
import { StorefrontSettings } from '@/components/dashboard/StorefrontSettings';
import { cn } from '@/lib/utils';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile');

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 sm:px-6 py-6 max-w-5xl">
        <Card className="border shadow-sm">
          <div className="p-8">
            {/* Header */}
            <div className="mb-6">
              <h1 className="text-2xl font-semibold mb-1">Configurações</h1>
              <p className="text-sm text-muted-foreground">
                Gerencie suas informações pessoais e configurações da vitrine
              </p>
            </div>

            {/* Tabs */}
            <div className="flex gap-4 border-b mb-8">
              <button
                onClick={() => setActiveTab('profile')}
                className={cn(
                  'px-4 py-3 text-sm font-medium transition-colors relative',
                  activeTab === 'profile'
                    ? 'text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Perfil
                {activeTab === 'profile' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground" />
                )}
              </button>
              <button
                onClick={() => setActiveTab('storefront')}
                className={cn(
                  'px-4 py-3 text-sm font-medium transition-colors relative',
                  activeTab === 'storefront'
                    ? 'text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Vitrine
                {activeTab === 'storefront' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground" />
                )}
              </button>
            </div>

            {/* Content */}
            <div>
              {activeTab === 'profile' && <ProfileSettings />}
              {activeTab === 'storefront' && <StorefrontSettings />}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
