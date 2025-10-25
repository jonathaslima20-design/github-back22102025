import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ProfileSettings } from '@/components/dashboard/ProfileSettings';
import { StorefrontSettings } from '@/components/dashboard/StorefrontSettings';
import { User, Store, Settings2, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile');

  const tabs = [
    {
      id: 'profile',
      label: 'Perfil',
      description: 'Gerencie suas informações pessoais e credenciais',
      icon: User,
      color: 'from-blue-500/10 to-cyan-500/10',
      iconColor: 'text-blue-600 dark:text-blue-400',
      borderColor: 'border-blue-500/50',
    },
    {
      id: 'storefront',
      label: 'Vitrine',
      description: 'Personalize a aparência da sua loja',
      icon: Store,
      color: 'from-emerald-500/10 to-green-500/10',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      borderColor: 'border-emerald-500/50',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-7xl">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-2">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-emerald-500 rounded-2xl blur-lg opacity-20"></div>
              <div className="relative p-3 rounded-2xl bg-gradient-to-br from-blue-500 to-emerald-500 text-white shadow-lg">
                <Settings2 className="h-7 w-7" />
              </div>
            </div>
            <div>
              <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
                Configurações
              </h1>
              <p className="text-muted-foreground mt-1 text-base">
                Personalize sua experiência e gerencie suas preferências
              </p>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-[320px_1fr] gap-6">
          {/* Sidebar Navigation */}
          <aside className="space-y-3">
            <div className="space-y-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <motion.div
                    key={tab.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Card
                      className={cn(
                        'cursor-pointer transition-all duration-300 border-2 overflow-hidden group',
                        isActive
                          ? `${tab.borderColor} shadow-lg bg-gradient-to-br ${tab.color}`
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md bg-white/50 dark:bg-slate-900/50'
                      )}
                      onClick={() => setActiveTab(tab.id)}
                    >
                      <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div
                              className={cn(
                                'p-3 rounded-xl transition-all duration-300',
                                isActive
                                  ? `${tab.iconColor} bg-white/80 dark:bg-slate-800/80 shadow-sm`
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 group-hover:bg-slate-200 dark:group-hover:bg-slate-700'
                              )}
                            >
                              <Icon className="h-5 w-5" />
                            </div>
                            <div className="flex-1">
                              <h3
                                className={cn(
                                  'font-semibold text-base mb-1 transition-colors',
                                  isActive
                                    ? 'text-slate-900 dark:text-white'
                                    : 'text-slate-700 dark:text-slate-300'
                                )}
                              >
                                {tab.label}
                              </h3>
                              <p className="text-xs text-muted-foreground leading-relaxed">
                                {tab.description}
                              </p>
                            </div>
                          </div>
                          <ChevronRight
                            className={cn(
                              'h-5 w-5 transition-all duration-300',
                              isActive
                                ? `${tab.iconColor} translate-x-1`
                                : 'text-slate-400 dark:text-slate-600 group-hover:translate-x-1 group-hover:text-slate-600 dark:group-hover:text-slate-400'
                            )}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>

            {/* Info Card */}
            <Card className="border-2 border-slate-200 dark:border-slate-800 bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Dica</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Mantenha suas informações atualizadas para uma melhor experiência e segurança da sua conta.
                </p>
              </CardContent>
            </Card>
          </aside>

          {/* Main Content */}
          <main>
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="border-2 border-slate-200 dark:border-slate-800 shadow-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
                  <CardContent className="p-6 md:p-8">
                    {activeTab === 'profile' && <ProfileSettings />}
                    {activeTab === 'storefront' && <StorefrontSettings />}
                  </CardContent>
                </Card>
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>
    </div>
  );
}
