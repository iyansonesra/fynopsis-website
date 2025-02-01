import * as React from 'react';
import {
    SpreadsheetComponent,
    SheetsDirective,
    SheetDirective,
    RangesDirective,
    RangeDirective,
    CellEditEventArgs,
    BeforePasteEventArgs
} from '@syncfusion/ej2-react-spreadsheet';
import './spreadsheet.css';
import { registerLicense } from '@syncfusion/ej2-base';


registerLicense('ORg4AjUWIQA/Gnt2XVhhQlJHfV5AQmBIYVp/TGpJfl96cVxMZVVBJAtUQF1hTH5SdkNiW3xecHFdTmhf');

interface SpreadsheetProps {
    data?: any[];
}

const SpreadsheetApp: React.FC<SpreadsheetProps> = ({ data }) => {
    const spreadsheetRef = React.useRef<SpreadsheetComponent>(null);

    const defaultData = [
        { OrderID: 10248, CustomerID: 'VINET', EmployeeID: 5, ShipCity: 'Reims' },
        { OrderID: 10249, CustomerID: 'TOMSP', EmployeeID: 6, ShipCity: 'Münster' },
        { OrderID: 10250, CustomerID: 'HANAR', EmployeeID: 4, ShipCity: 'Lyon' }
    ];

    React.useEffect(() => {
        if (spreadsheetRef.current) {
            spreadsheetRef.current.hideFileMenuItems(['File'], true);
        }
    }, []);

    React.useEffect(() => {
        if (spreadsheetRef.current) {
            spreadsheetRef.current.refresh();
        }

        return () => {
            // Cleanup
            if (spreadsheetRef.current) {
                spreadsheetRef.current.destroy();
            }
        };
    }, []);

    const onCellEdit = (args: CellEditEventArgs): void => {
        args.cancel = true;
    };

    const beforePaste = (args: BeforePasteEventArgs): void => {
        args.cancel = true;
    };

    return (
        <div style={{ width: '100%', height: '100%' }}>

            <SpreadsheetComponent
                ref={spreadsheetRef}
                allowOpen={false}
                allowSave={false}
                cellEdit={onCellEdit}
                // beforePaste={beforePaste}
                allowEditing={false}
                // isReadOnly={true}
                enableClipboard={false}
                enableKeyboardNavigation={false}
                showRibbon={false}
                showFormulaBar={false}
                height='100%'
                width='100%'
            >
                <SheetsDirective>
                    <SheetDirective>
                        <RangesDirective>
                            <RangeDirective dataSource={data || defaultData}></RangeDirective>
                        </RangesDirective>
                    </SheetDirective>
                </SheetsDirective>
            </SpreadsheetComponent>
        </div>
    );
};

export default SpreadsheetApp;

