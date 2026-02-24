'use client'
import useSWR from 'swr';
import api from './api';

export const useContacts = () => useSWR('/api/contacts', ()=> api.get('/api/contacts'));
export const useDeals = () => useSWR('/api/deals', ()=> api.get('/api/deals'));
export const useDocuments = () => useSWR('/api/documents', ()=> api.get('/api/documents'));
export const useChecklists = () => useSWR('/api/checklists', ()=> api.get('/api/checklists'));
export const useOffers = () => useSWR('/api/offers', ()=> api.get('/api/offers'));
export const useTimeline = (dealId?:string) => useSWR(dealId?`/api/deals/${dealId}/timeline`:null, ()=> api.get(`/api/deals/${dealId}/timeline`));
export default { useContacts, useDeals, useDocuments, useChecklists, useOffers, useTimeline };
