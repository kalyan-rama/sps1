/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Heart, MoveRight, Star, ShieldCheck } from 'lucide-react';
import { Saree } from '../types';

interface SareeCardProps {
  key?: string;
  saree: Saree;
  onViewDetails: (saree: Saree) => void;
  onToggleWishlist: (saree: Saree) => void;
  isWishlisted: boolean;
  onInstantMatch: (saree: Saree) => void;
}

export default function SareeCard({
  saree,
  onViewDetails,
  onToggleWishlist,
  isWishlisted,
  onInstantMatch
}: SareeCardProps) {
  const formattedPrice = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(saree.price);

  const formattedOriginalPrice = saree.originalPrice
    ? new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
      }).format(saree.originalPrice)
    : null;

  const discount = saree.originalPrice
    ? Math.round(((saree.originalPrice - saree.price) / saree.originalPrice) * 100)
    : 0;

  return (
    <div 
      id={`saree-card-${saree.id}`}
      className="group bg-stone-50 rounded-xl overflow-hidden shadow-sm hover:shadow-xl border border-stone-200/60 transition-all duration-300 flex flex-col h-full"
    >
      {/* Visual Header */}
      <div className="relative aspect-[3/4] overflow-hidden bg-stone-100">
        
        {/* Main Product Image */}
        <img
          src={saree.image}
          alt={saree.name}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700 Ease-out"
        />

        {/* Shadow overlays */}
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/50 via-black/10 to-transparent opacity-80" />

        {/* Tags */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
          {saree.tags.map((tag, index) => (
            <span
              key={index}
              className="text-[10px] tracking-wider uppercase bg-stone-900/95 backdrop-blur-sm text-amber-100 px-2.5 py-1 rounded-sm font-semibold border border-amber-800/20 shadow-sm"
            >
              {tag}
            </span>
          ))}
          {discount > 0 && (
            <span className="text-[10px] tracking-widest bg-amber-600 text-stone-950 px-2.5 py-1 rounded-sm font-bold shadow-sm">
              {discount}% OFF
            </span>
          )}
        </div>

        {/* Wishlist Heart Icon */}
        <button
          onClick={() => onToggleWishlist(saree)}
          className="absolute top-3 right-3 z-10 p-2.5 bg-stone-50/90 backdrop-blur-sm hover:bg-stone-50 rounded-full text-stone-900 shadow-md transition-all active:scale-90 hover:text-rose-600"
          title={isWishlisted ? "Remove from Wishlist" : "Add to Wishlist"}
          aria-label={isWishlisted ? "Remove from Wishlist" : "Add to Wishlist"}
        >
          <Heart
            className={`w-4.5 h-4.5 transition-colors ${
              isWishlisted ? 'fill-rose-600 text-rose-600' : 'text-stone-700'
            }`}
          />
        </button>

        {/* Quick specs pill */}
        <div className="absolute bottom-3 left-3 right-3 flex justify-between items-center text-stone-50 text-xs">
          <div className="flex items-center gap-1 bg-black/40 backdrop-blur-md px-2 py-1 rounded">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span className="font-bold">{saree.rating}</span>
          </div>
          
          {saree.silkMarkApproved && (
            <div className="flex items-center gap-1 bg-emerald-950/80 backdrop-blur-md text-emerald-300 px-2 py-1 rounded border border-emerald-500/20">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span className="font-semibold text-[10px] tracking-wider uppercase">Silk Mark</span>
            </div>
          )}
        </div>
      </div>

      {/* Information Body */}
      <div className="p-4 flex flex-col flex-grow bg-stone-50/50">
        <span className="text-[10px] uppercase tracking-widest text-amber-800 font-mono font-bold mb-1">
          {saree.type} • {saree.origin}
        </span>
        
        <h3 className="font-serif text-base text-stone-900 hover:text-amber-900 font-bold tracking-normal line-clamp-1 mb-1.5">
          {saree.name}
        </h3>
        
        <p className="text-stone-600 text-xs line-clamp-2 leading-relaxed mb-4 flex-grow">
          {saree.description}
        </p>

        {/* Price & Action */}
        <div className="mt-auto border-t border-stone-200/50 pt-3.5">
          <div className="flex items-end justify-between mb-4">
            <div className="flex flex-col">
              <span className="text-xl font-extrabold text-stone-900">{formattedPrice}</span>
              {formattedOriginalPrice && (
                <span className="text-stone-400 text-xs line-through mt-0.5">{formattedOriginalPrice}</span>
              )}
            </div>
            <div className="text-right text-[10px] text-stone-500 font-mono">
              <span className="block font-bold">100% Pure Silk</span>
              <span>~{saree.weight}g weight</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            
            {/* Action 1: Interactive Blouse Creator */}
            <button
              id={`btn-match-${saree.id}`}
              onClick={() => onInstantMatch(saree)}
              className="text-amber-900 border border-amber-900 hover:bg-amber-900/5 text-xs font-semibold py-2 rounded transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Match Blouse</span>
            </button>

            {/* Action 2: View Details */}
            <button
              id={`btn-details-${saree.id}`}
              onClick={() => onViewDetails(saree)}
              className="bg-amber-900 text-stone-50 hover:bg-amber-950 text-xs font-semibold py-2 rounded transition-colors flex items-center justify-center gap-1 group-hover:gap-1.5 cursor-pointer"
            >
              <span>View Heritage</span>
              <MoveRight className="w-3.5 h-3.5" />
            </button>

          </div>
        </div>
      </div>
    </div>
  );
}
