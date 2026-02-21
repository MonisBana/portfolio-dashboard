describe('Manual Assets Management', () => {
    beforeEach(() => {
        cy.visit('/upload', {
            onBeforeLoad(win) {
                win.indexedDB.deleteDatabase('PortfolioDB');
            }
        });
        // Wait for page to be fully loaded
        cy.contains('Manual Assets').should('be.visible');
    });

    it('should add a Cash entry and reflect in dashboard', () => {
        cy.get('[data-testid="add-manual-asset-btn"]').click();

        // Wait for dialog to open
        cy.contains('Add Manual Asset').should('be.visible');

        // Cash is default, so no need to change the select
        // cy.get('[data-testid="manual-type-select"]').click();
        // cy.contains('Cash').click();

        cy.get('[data-testid="manual-amount-input"]').type('50000');

        cy.get('[data-testid="manual-submit-btn"]').click({ force: true });

        // Wait for dialog to close and data to appear
        cy.contains('Add Manual Asset').should('not.exist');

        // Check if listed in table
        cy.contains('Cash').should('be.visible');
        cy.contains('₹50,000').should('be.visible');

        // Check dashboard
        cy.visit('/dashboard');
        cy.contains('₹50,000').should('be.visible');
    });

    it('should add a Fixed Deposit and reflect correctly', () => {
        cy.get('[data-testid="add-manual-asset-btn"]').click();

        // Wait for dialog to open
        cy.contains('Add Manual Asset').should('be.visible');

        cy.get('[data-testid="manual-type-select"]').click();
        cy.contains('Fixed Deposit').click({ force: true });

        cy.get('[data-testid="manual-amount-input"]').type('100000');

        cy.get('[data-testid="manual-submit-btn"]').click({ force: true });

        // Wait for dialog to close
        cy.contains('Add Manual Asset').should('not.exist');

        cy.contains('Fixed Deposit').should('be.visible');
        cy.get('body').should('contain.text', '1,00,000'); // Flexible format
    });
});
