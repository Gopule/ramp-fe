import { Fragment, useCallback, useEffect, useMemo, useState, useRef } from "react"
import { InputSelect } from "./components/InputSelect"
import { Instructions } from "./components/Instructions"
import { Transactions } from "./components/Transactions"
import { useEmployees } from "./hooks/useEmployees"
import { usePaginatedTransactions } from "./hooks/usePaginatedTransactions"
import { useTransactionsByEmployee } from "./hooks/useTransactionsByEmployee"
import { EMPTY_EMPLOYEE } from "./utils/constants"
import { Employee, Transaction } from "./utils/types"

export function App() {
  const { data: employees, ...employeeUtils } = useEmployees()
  const { data: paginatedTransactions, ...paginatedTransactionsUtils } = usePaginatedTransactions()
  const { data: transactionsByEmployee, ...transactionsByEmployeeUtils } = useTransactionsByEmployee()
  const [isLoading, setIsLoading] = useState(false)
  const [currentEmployee, setCurrentEmployee] = useState("")
  const initialTransactions = paginatedTransactions?.data ?? transactionsByEmployee ?? null
  const transactionsRef = useRef(initialTransactions)

  const filterDuplicateTransactions = (transactions: Transaction[]) => {
    const uniqueTransactionIds = new Set()
    return transactions.reduce((acc: Transaction[], transaction: Transaction) => {
      if (!uniqueTransactionIds.has(transaction.id)) {
        acc.push(transaction)
        uniqueTransactionIds.add(transaction.id)
      }
      return acc
    }, [])
  }

  const transactions = useMemo(() => {
    const updatedTransactions = paginatedTransactions?.data
      ? (transactionsRef.current
        ? filterDuplicateTransactions([...transactionsRef.current, ...paginatedTransactions?.data])
        : paginatedTransactions?.data)
      : transactionsByEmployee
      ? (transactionsRef.current
        ? filterDuplicateTransactions([...transactionsRef.current, ...transactionsByEmployee])
        : transactionsByEmployee)
      : null

    transactionsRef.current = updatedTransactions
    return updatedTransactions
  }, [paginatedTransactions, transactionsByEmployee])

  const loadAllTransactions = useCallback(async () => {
    setIsLoading(true)
    transactionsByEmployeeUtils.invalidateData()

    await employeeUtils.fetchAll()
    await paginatedTransactionsUtils.fetchAll()

    setIsLoading(false)
  }, [employeeUtils, paginatedTransactionsUtils, transactionsByEmployeeUtils])

  const loadTransactionsByEmployee = useCallback(
    async (employeeId: string) => {
      paginatedTransactionsUtils.invalidateData()
      await transactionsByEmployeeUtils.fetchById(employeeId)
    },
    [paginatedTransactionsUtils, transactionsByEmployeeUtils]
  )

  useEffect(() => {
    if (employees === null && !employeeUtils.loading) {
      loadAllTransactions()
    }
  }, [employeeUtils.loading, employees, loadAllTransactions])

  return (
    <Fragment>
      <main className="MainContainer">
        <Instructions />

        <hr className="RampBreak--l" />

        <InputSelect<Employee>
          isLoading={isLoading}
          defaultValue={EMPTY_EMPLOYEE}
          items={employees === null ? [] : [EMPTY_EMPLOYEE, ...employees]}
          label="Filter by employee"
          loadingLabel="Loading employees"
          parseItem={(item) => ({
            value: item.id,
            label: `${item.firstName} ${item.lastName}`,
          })}
          onChange={async (newValue) => {
            if (newValue === null) {
              return
            }

            if (newValue.id === "") {
              await loadAllTransactions()
            } else {
              setCurrentEmployee(newValue.id)
              await loadTransactionsByEmployee(newValue.id)
            }
          }}
        />

        <div className="RampBreak--l" />

        <div className="RampGrid">
          <Transactions transactions={transactions} />

          {transactions !== null && (
            <button
              className="RampButton"
              disabled={paginatedTransactionsUtils.loading}
              onClick={async () => {
                if (currentEmployee === "") {
                  await loadAllTransactions()
                } else {
                  await loadTransactionsByEmployee(currentEmployee)
                }
              }}
            >
              View More
            </button>
          )}
        </div>
      </main>
    </Fragment>
  )
}
