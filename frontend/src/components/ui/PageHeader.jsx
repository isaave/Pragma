import React from 'react';

export default function PageHeader({ title, subtitle }) {
    return (
        <header className="page-header">
            <div className="page-header-text">
                <h1 className="page-header-title">{title}</h1>
                <p className="page-header-subtitle">{subtitle}</p>
            </div>
        </header>
    );
}
