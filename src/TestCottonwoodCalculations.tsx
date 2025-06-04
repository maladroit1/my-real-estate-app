import React from 'react';

export const TestCottonwoodCalculations: React.FC = () => {
  // Test calculations for Cottonwood Heights
  const landParcels = [
    { id: 1, name: "Parcel 1", acres: 10, pricePerAcre: 400000, isDonated: false },
    { id: 2, name: "Parcel 2", acres: 5, pricePerAcre: 0, isDonated: true },
    { id: 3, name: "Parcel 3", acres: 5, pricePerAcre: 0, isDonated: true },
  ];

  const calculateLandCost = landParcels.reduce((total, parcel) => {
    return total + (parcel.isDonated ? 0 : parcel.acres * parcel.pricePerAcre);
  }, 0);

  const groundLease = {
    enabled: true,
    baseRent: 0,
    percentRent: 5,
    percentRentOnly: false,
  };

  // Calculate monthly ground lease payment
  const annualGroundLeasePayment = groundLease.enabled ? 
    (groundLease.baseRent + (calculateLandCost * groundLease.percentRent / 100)) : 0;
  const monthlyGroundLeasePayment = annualGroundLeasePayment / 12;

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h2 className="text-lg font-bold mb-4">Cottonwood Heights Test Calculations</h2>
      
      <div className="space-y-2">
        <div className="flex justify-between">
          <span>Total Land Cost:</span>
          <span className="font-semibold">${calculateLandCost.toLocaleString()}</span>
        </div>
        
        <div className="flex justify-between">
          <span>Purchased Acres:</span>
          <span>{landParcels.filter(p => !p.isDonated).reduce((sum, p) => sum + p.acres, 0)}</span>
        </div>
        
        <div className="flex justify-between">
          <span>Price per Purchased Acre:</span>
          <span>${(400000).toLocaleString()}</span>
        </div>
        
        {groundLease.enabled && (
          <>
            <hr className="my-2" />
            <div className="text-sm text-gray-600">Ground Lease Calculations:</div>
            
            <div className="flex justify-between">
              <span>Annual Base Rent:</span>
              <span>${groundLease.baseRent.toLocaleString()}</span>
            </div>
            
            <div className="flex justify-between">
              <span>Percentage Rent ({groundLease.percentRent}% of land):</span>
              <span>${(calculateLandCost * groundLease.percentRent / 100).toLocaleString()}</span>
            </div>
            
            <div className="flex justify-between">
              <span>Annual Ground Lease Payment:</span>
              <span className="font-semibold">${annualGroundLeasePayment.toLocaleString()}</span>
            </div>
            
            <div className="flex justify-between">
              <span>Monthly Ground Lease Payment:</span>
              <span className="font-semibold">${monthlyGroundLeasePayment.toFixed(0)}</span>
            </div>
          </>
        )}
        
        <hr className="my-2" />
        <div className="text-sm text-red-600">
          If you're seeing ${monthlyGroundLeasePayment.toFixed(0)} instead of ${calculateLandCost.toLocaleString()}, 
          the ground lease payment is being displayed instead of the land cost.
        </div>
      </div>
    </div>
  );
};