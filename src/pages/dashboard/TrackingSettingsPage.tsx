import TrackingSettingsContent from '@/components/dashboard/TrackingSettingsContent';

export default function TrackingSettingsPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Configurações de Rastreamento</h1>
        <p className="text-muted-foreground">Configure pixels e tags de rastreamento para suas campanhas</p>
      </div>
      <TrackingSettingsContent />
    </div>
  );
}
