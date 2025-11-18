"use client";

interface PartyStatusBannerProps {
  party: {
    status: string;
  };
}

const statusConfig = {
  waiting: {
    label: 'Waiting for Members to Join',
    color: 'border-yellow-200',
  },
  collecting_preferences: {
    label: 'Collecting Preferences',
    color: 'border-blue-200',
  },
  swiping: {
    label: 'Swiping in Progress',
    color: 'border-green-200',
  },
  completed: {
    label: 'Completed',
    color: 'border-gray-200',
  },
};

export function PartyStatusBanner({ party }: PartyStatusBannerProps) {
  const config = statusConfig[party.status as keyof typeof statusConfig] || statusConfig.waiting;

  return (
    <div className={`mb-4 p-3 rounded-lg border ${config.color}`}>
      <p className="font-semibold">{config.label}</p>
    </div>
  );
}

