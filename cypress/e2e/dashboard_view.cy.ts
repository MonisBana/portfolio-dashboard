describe('Dashboard Views and Interaction', () => {
    beforeEach(() => {
        // Seed data for dashboard tests
        cy.visit('/upload', {
            onBeforeLoad(win) {
                win.indexedDB.deleteDatabase('PortfolioDB');
            }
        });
        cy.contains('Upload Files').should('be.visible');

        cy.get('[data-testid="file-upload-input"]').selectFile('cypress/fixtures/zerodha_sample.xlsx', { force: true });
        cy.contains('Upload File').should('be.visible');
        cy.get('[data-testid="broker-select-trigger"]').click({ force: true });
        cy.contains('Zerodha').click({ force: true });
        cy.get('[data-testid="upload-submit-btn"]').click({ force: true });
        cy.contains('Completed', { timeout: 10000 }).should('be.visible');
    });

    it('should display all charts correctly', () => {
        cy.visit('/dashboard');

        // Wait for data to load
        cy.contains('₹27,500', { timeout: 10000 }).should('be.visible');

        // Check for Chart Titles to verify existence
        cy.contains('Asset Allocation').should('be.visible');
        cy.contains('Portfolio by Sector').should('be.visible');
        cy.contains('Geographic Allocation').should('be.visible');
        cy.contains('Broker Allocation').should('be.visible');

        // Verify charts are rendered
        cy.get('.recharts-wrapper').should('have.length.at.least', 4);
    });

    it('should navigate to sub-pages and display valid data', () => {
        cy.visit('/dashboard');
        // Wait for data
        cy.contains('₹27,500', { timeout: 10000 }).should('be.visible');

        // The main dashboard page should show holdings
        cy.contains('INFY').should('be.visible');
        cy.contains('RELIANCE').should('be.visible');
    });

    it('should sort the holdings table', () => {
        cy.visit('/dashboard');
        cy.contains('₹27,500', { timeout: 10000 }).should('be.visible');

        // First sort (descending by default when clicking)
        cy.get('[data-testid="sort-symbol"]').click({ force: true });

        // First click should be desc (R before I)
        cy.get('[data-testid="stock-row"]').eq(0).should('contain', 'RELIANCE');
        cy.get('[data-testid="stock-row"]').eq(1).should('contain', 'INFY');

        // Click again to sort ascending
        cy.get('[data-testid="sort-symbol"]').click({ force: true });
        cy.get('[data-testid="stock-row"]').eq(0).should('contain', 'INFY');
        cy.get('[data-testid="stock-row"]').eq(1).should('contain', 'RELIANCE');
    });
});
