import React from 'react';

export const ComparisonChart: React.FC = () => {
  const data = [
    { label: 'Traditional', value: 35, color: 'bg-muted' },
    { label: 'With Aetheris AI', value: 95, color: 'bg-gradient-to-r from-amber to-primary' },
  ];

  return (
    <div className="w-full max-w-md space-y-6">
      {data.map((item) => (
        <div key={item.label} className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{item.label}</span>
            <span className="text-foreground font-bold">{item.value}%</span>
          </div>
          <div className="h-8 bg-secondary rounded-full overflow-hidden">
            <div
              className={`h-full ${item.color} rounded-full transition-all duration-1000 ease-out flex items-center justify-end pr-3`}
              style={{ width: `${item.value}%` }}
            >
              {item.value > 50 && (
                <span className="text-xs font-bold text-background">{item.value}%</span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
