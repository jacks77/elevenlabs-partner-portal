
import React from 'react';
import { Navigate } from 'react-router-dom';

// This page is no longer needed - users can sign in directly after approval
export default function CompleteAccount() {
  return <Navigate to="/sign-in" replace />;
}
