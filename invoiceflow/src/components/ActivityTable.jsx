function ActivityTable() {
  return (
    <div className="card card-dark mt-4">

      <div className="card-header">
        Recent Activity
      </div>

      <div className="table-responsive">

        <table className="table table-dark table-hover mb-0">

          <thead>
            <tr>
              <th>ID</th>
              <th>Customer</th>
              <th>Status</th>
              <th>Amount</th>
            </tr>
          </thead>

          <tbody>
            <tr>
              <td>#INV-001</td>
              <td>Alice Johnson</td>
              <td>Paid</td>
              <td>₹12,000</td>
            </tr>

            <tr>
              <td>#INV-002</td>
              <td>Bob Smith</td>
              <td>Pending</td>
              <td>₹8,500</td>
            </tr>
          </tbody>

        </table>

      </div>

    </div>
  );
}

export default ActivityTable;